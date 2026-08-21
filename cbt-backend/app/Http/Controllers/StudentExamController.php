<?php

namespace App\Http\Controllers;

use App\Events\ExamSessionUpdated;
use App\Models\AuditLog;
use App\Models\Exam;
use App\Models\ExamAnswer;
use App\Models\ExamSession;
use App\Models\Option;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StudentExamController extends Controller
{
    /**
     * GET /api/student/exams
     * List exams currently available to the student, with their session status.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $exams = Exam::query()
            ->withCount('questions')
            ->with(['subject', 'classrooms:id,name'])
            ->where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('start_time')->orWhere('start_time', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_time')->orWhere('end_time', '>=', now());
            })
            ->where(function ($q) use ($user) {
                // Ujian tanpa penetapan kelas → untuk semua siswa.
                // Ujian dengan penetapan kelas → hanya kelas siswa tersebut.
                $q->whereDoesntHave('classrooms')
                    ->orWhereHas('classrooms', fn ($c) => $c->whereKey($user->class_id));
            })
            ->orderBy('start_time')
            ->get();

        // Muat SEMUA sesi milik user (termasuk yang sudah selesai) untuk ditampilkan
        $allUserSessions = ExamSession::query()
            ->where('user_id', $user->id)
            ->with('exam:id,title')
            ->orderByDesc('id')
            ->get();

        // Sesi aktif (ongoing/blocked) untuk ujian yang masih tampil
        $activeSessions = $allUserSessions->whereIn('status', ['ongoing', 'blocked'])
            ->keyBy('exam_id');

        // Sesi selesai yang ujiannya sudah tidak tampil (expired/closed)
        $finishedOrphan = $allUserSessions->where('status', 'finished')
            ->whereIn('exam_id', $exams->pluck('id')->negate())
            ->take(10);

        return response()->json([
            'success' => true,
            'message' => 'Daftar ujian berhasil dimuat.',
            'data' => $exams->map(function (Exam $exam) use ($activeSessions) {
                $session = $activeSessions->get($exam->id);

                return [
                    'id' => $exam->id,
                    'title' => $exam->title,
                    'duration_minutes' => $exam->duration_minutes,
                    'start_time' => $exam->start_time?->toIso8601String(),
                    'end_time' => $exam->end_time?->toIso8601String(),
                    'subject' => $exam->subject?->name,
                    'questions_count' => $exam->questions_count,
                    'session' => $session ? [
                        'id' => $session->id,
                        'status' => $session->status,
                        'started_at' => $session->started_at?->toIso8601String(),
                        'finished_at' => $session->finished_at?->toIso8601String(),
                        'cheat_count' => $session->cheat_count,
                    ] : null,
                ];
            })->values(),
        ]);
    }

    /**
     * POST /api/student/exams/{id}/start
     * Start an exam session (or resume an ongoing one).
     */
    public function start(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $exam = Exam::query()
            ->with('questions')
            ->where('id', $id)
            ->where('status', 'published')
            ->first();

        if (! $exam) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian tidak ditemukan atau belum dipublikasikan.',
                'data' => null,
            ], 404);
        }

        // Ujian dikhususkan untuk kelas tertentu — cek keanggotaan siswa
        if (! $exam->isVisibleToStudent($user)) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian tidak tersedia untuk kelas Anda.',
                'data' => null,
            ], 403);
        }

        // Belum waktunya ujian
        if ($exam->start_time && $exam->start_time->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian belum dimulai.',
                'data' => null,
            ], 403);
        }

        // Ujian sudah berakhir
        if ($exam->end_time && $exam->end_time->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian sudah berakhir.',
                'data' => null,
            ], 403);
        }

        // Ujian belum memiliki soal — jangan biarkan siswa masuk
        if ($exam->questions()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian belum memiliki soal. Hubungi guru Anda.',
                'data' => null,
            ], 422);
        }

        // Cek percobaan yang sudah habis
        $finishedCount = ExamSession::where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->where('status', 'finished')
            ->count();

        $maxAttempts = $exam->max_attempts ?? 1;
        if ($finishedCount >= $maxAttempts) {
            return response()->json([
                'success' => false,
                'message' => "Anda sudah menggunakan semua percobaan ({$maxAttempts}x).",
                'data' => null,
            ], 422);
        }

        // Cek sesi aktif milik user
        $session = ExamSession::query()
            ->where('exam_id', $exam->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['ongoing', 'blocked'])
            ->latest('id')
            ->first();

        // Sesi blocked yang sudah melewati durasi → auto-finish
        if ($session && $session->status === 'blocked' && $this->isExpired($session, $exam)) {
            $this->finish($session);
            $session = null;
        }

        if ($session && $session->status === 'blocked') {
            return $this->blockedResponse();
        }

        // Sesi ongoing yang sudah melewati durasi → auto-finish, mulai sesi baru
        if ($session && $this->isExpired($session, $exam)) {
            $this->finish($session);
            $session = null;
        }

        if (! $session) {
            $session = ExamSession::create([
                'exam_id' => $exam->id,
                'user_id' => $user->id,
                'started_at' => now(),
                'status' => 'ongoing',
                'cheat_count' => 0,
                'attempt_number' => $finishedCount + 1,
                'time_extension_minutes' => 0,
            ]);

            AuditLog::log('exam.start', $session, [
                'attempt' => $finishedCount + 1,
            ]);
        }

        // Beri tahu Live Monitor admin secara real-time
        ExamSessionUpdated::dispatch($session, 'start');

        $effectiveDuration = $exam->duration_minutes + ($session->time_extension_minutes ?? 0);

        return response()->json([
            'success' => true,
            'message' => 'Ujian dimulai. Kerjakan dengan jujur!',
            'data' => [
                'session_id' => $session->id,
                'exam_id' => $exam->id,
                'title' => $exam->title,
                'duration_minutes' => $effectiveDuration,
                'started_at' => $session->started_at?->toIso8601String(),
                'questions_count' => $exam->questions->count(),
                'instructions' => $exam->instructions,
                'attempt_number' => $session->attempt_number ?? 1,
                'max_attempts' => $maxAttempts,
                'status' => $session->status,
            ],
        ]);
    }

    /**
     * GET /api/student/exam-sessions/{id}
     * Fetch the questions for an ongoing session (shuffled), with saved answers.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $session = ExamSession::with(['exam.questions.options', 'answers'])
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi ujian tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $exam = $session->exam;

        // Sesi blocked yang sudah melewati durasi → auto-finish
        if ($session->status === 'blocked' && $this->isExpired($session, $exam)) {
            $this->finish($session);
            return response()->json([
                'success' => false,
                'message' => 'Waktu ujian telah habis. Ujian otomatis dikumpulkan.',
                'data' => null,
            ], 403);
        }

        if ($session->status === 'blocked') {
            return $this->blockedResponse();
        }

        if ($session->status === 'finished') {
            return response()->json([
                'success' => false,
                'message' => 'Ujian sudah selesai.',
                'data' => null,
            ], 403);
        }

        if ($expired = $this->finishIfExpired($session, $exam)) {
            return $expired;
        }

        if ($exam->questions()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian belum memiliki soal. Hubungi guru Anda.',
                'data' => null,
            ], 422);
        }

        $answers = $session->answers->keyBy('question_id');

        // Gunakan seed berbasis session_id agar urutan soal & opsi konsisten
        // (tidak berubah saat siswa refresh halaman)
        $sessionSeed = $session->id * 1000;
        $questions = $exam->questions
            ->shuffle($sessionSeed)
            ->map(function (Question $question) use ($answers, $sessionSeed) {
                $saved = $answers->get($question->id);

                return [
                    'id' => $question->id,
                    'type' => $question->type,
                    'question_text' => $question->question_text,
                    'media_url' => $question->media_url,
                    'options' => $question->options->shuffle($sessionSeed + $question->id)->map(fn (Option $option) => [
                        'id' => $option->id,
                        'option_text' => $option->option_text,
                    ])->values(),
                    'saved_option_id' => $saved?->option_id,
                    'saved_essay_text' => $saved?->essay_text,
                ];
            })
            ->values();

        $effectiveDuration = $exam->duration_minutes + ($session->time_extension_minutes ?? 0);

        return response()->json([
            'success' => true,
            'message' => 'Soal ujian berhasil dimuat.',
            'data' => [
                'session_id' => $session->id,
                'exam_id' => $exam->id,
                'title' => $exam->title,
                'instructions' => $exam->instructions,
                'duration_minutes' => $effectiveDuration,
                'remaining_seconds' => $this->remainingSeconds($session, $exam),
                'attempt_number' => $session->attempt_number ?? 1,
                'questions' => $questions,
            ],
        ]);
    }

    /**
     * POST /api/student/exam-sessions/{id}/answer
     * Save (or update) the student's answer for a single question.
     */
    public function answer(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        try {
            $validated = $request->validate([
                'question_id' => ['required', 'integer'],
                'option_id' => ['nullable', 'integer'],
                'essay_text' => ['nullable', 'string'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Data jawaban tidak valid.',
                'data' => ['errors' => $e->errors()],
            ], 422);
        }

        $session = ExamSession::query()
            ->with('exam')
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi ujian tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($session->status === 'blocked') {
            return $this->blockedResponse();
        }

        if ($session->status !== 'ongoing') {
            return response()->json([
                'success' => false,
                'message' => 'Ujian sudah selesai.',
                'data' => null,
            ], 403);
        }

        $exam = $session->exam;
        if ($expired = $this->finishIfExpired($session, $exam, 'Waktu ujian telah habis. Jawaban tidak dapat disimpan.')) {
            return $expired;
        }

        $question = Question::query()
            ->where('id', $validated['question_id'])
            ->where('exam_id', $exam->id)
            ->first();

        if (! $question) {
            return response()->json([
                'success' => false,
                'message' => 'Soal tidak valid untuk ujian ini.',
                'data' => null,
            ], 422);
        }

        $optionId = $validated['option_id'] ?? null;
        $essayText = $validated['essay_text'] ?? null;

        if ($question->type === 'pg' && ! $optionId) {
            return response()->json([
                'success' => false,
                'message' => 'Pilih salah satu opsi jawaban.',
                'data' => null,
            ], 422);
        }

        if ($question->type === 'essay') {
            if ($optionId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Soal essay dijawab dengan teks.',
                    'data' => null,
                ], 422);
            }
            if (! $essayText || trim($essayText) === '') {
                return response()->json([
                    'success' => false,
                    'message' => 'Jawaban essay tidak boleh kosong.',
                    'data' => null,
                ], 422);
            }
        }

        $isCorrect = null;
        if ($question->type === 'pg' && $optionId) {
            $option = Option::query()
                ->where('id', $optionId)
                ->where('question_id', $question->id)
                ->first();

            if (! $option) {
                return response()->json([
                    'success' => false,
                    'message' => 'Opsi jawaban tidak valid.',
                    'data' => null,
                ], 422);
            }
            $isCorrect = $option->is_correct;
        }

        $answer = ExamAnswer::updateOrCreate(
            [
                'exam_session_id' => $session->id,
                'question_id' => $question->id,
            ],
            [
                'option_id' => $optionId,
                'essay_text' => $essayText,
                'is_correct' => $isCorrect,
            ],
        );

        AuditLog::log('exam.answer', $session, [
            'question_id' => $question->id,
            'type' => $question->type,
        ]);

        // Catatan keamanan: `is_correct` TIDAK dikembalikan ke siswa agar
        // kunci jawaban tidak bisa dibocorkan lewat probing endpoint ini.
        return response()->json([
            'success' => true,
            'message' => 'Jawaban berhasil disimpan.',
            'data' => [
                'question_id' => $question->id,
                'option_id' => $answer->option_id,
                'essay_text' => $answer->essay_text,
            ],
        ]);
    }

    /**
     * POST /api/student/exam-sessions/{id}/submit
     * Finish the exam: auto-grade PG questions and close the session.
     */
    public function submit(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $session = ExamSession::query()
            ->with('exam.questions', 'answers')
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi ujian tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($session->status === 'blocked') {
            return $this->blockedResponse();
        }

        if ($session->status !== 'ongoing') {
            return response()->json([
                'success' => false,
                'message' => 'Ujian sudah selesai.',
                'data' => null,
            ], 403);
        }

        $exam = $session->exam;
        if ($expired = $this->finishIfExpired($session, $exam, 'Waktu ujian telah habis. Ujian otomatis dikumpulkan.')) {
            return $expired;
        }

        // Hitung nilai PG berbasis BOBOT per soal: bobot benar ÷ total bobot × 100
        $pgQuestions = $exam->questions->where('type', 'pg');
        $pgTotalWeight = (int) $pgQuestions->sum('score');
        $weightById = $pgQuestions->pluck('score', 'id');
        $pgCorrect = 0;
        $pgCorrectWeight = 0;

        foreach ($session->answers as $answer) {
            if ($answer->option_id && $answer->is_correct) {
                $pgCorrect++;
                $pgCorrectWeight += (int) ($weightById[$answer->question_id] ?? 1);
            }
        }

        $score = $pgTotalWeight > 0 ? round(($pgCorrectWeight / $pgTotalWeight) * 100, 2) : null;

        $this->finish($session);

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil dikumpulkan.',
            'data' => [
                'session_id' => $session->id,
                'finished_at' => $session->finished_at?->toIso8601String(),
                'score' => $score,
                'pg_correct' => $pgCorrect,
                'pg_total' => $pgQuestions->count(),
                'pg_correct_weight' => $pgCorrectWeight,
                'pg_total_weight' => $pgTotalWeight,
            ],
        ]);
    }

    /**
     * POST /api/student/exam-sessions/{id}/block
     * Called by the frontend when cheating is detected (left fullscreen / switched tab).
     */
    public function block(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $session = ExamSession::query()
            ->where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'ongoing')
            ->first();

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi ujian tidak ditemukan atau sudah tidak aktif.',
                'data' => null,
            ], 404);
        }

        $session->increment('cheat_count', 1, ['status' => 'blocked']);

        AuditLog::log('exam.block', $session, [
            'cheat_count' => $session->fresh()->cheat_count,
        ]);

        // Beri tahu Live Monitor admin secara real-time
        ExamSessionUpdated::dispatch($session->fresh(), 'blocked');

        return response()->json([
            'success' => true,
            'message' => 'Pelanggaran terdeteksi. Ujian dibekukan, hubungi pengawas.',
            'data' => [
                'session_id' => $session->id,
                'status' => $session->status,
                'cheat_count' => $session->cheat_count,
            ],
        ]);
    }

    /* ===== Helpers ===== */

    private function blockedResponse(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Sesi ujian Anda terblokir. Hubungi pengawas untuk membuka kembali.',
            'data' => null,
        ], 403);
    }

    private function isExpired(ExamSession $session, Exam $exam): bool
    {
        if (! $session->started_at) {
            return false;
        }

        $effectiveMinutes = $exam->duration_minutes + ($session->time_extension_minutes ?? 0);

        return $session->started_at->copy()->addMinutes($effectiveMinutes)->isPast();
    }

    private function finishIfExpired(ExamSession $session, Exam $exam, string $message = 'Waktu ujian telah habis.'): ?JsonResponse
    {
        if (! $this->isExpired($session, $exam)) {
            return null;
        }

        $this->finish($session);

        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
        ], 403);
    }

    private function remainingSeconds(ExamSession $session, Exam $exam): int
    {
        if (! $session->started_at) {
            return $exam->duration_minutes * 60;
        }

        $effectiveMinutes = $exam->duration_minutes + ($session->time_extension_minutes ?? 0);
        $deadline = $session->started_at->copy()->addMinutes($effectiveMinutes);

        return max(0, (int) now()->diffInSeconds($deadline, false));
    }

    private function finish(ExamSession $session): void
    {
        $session->update([
            'status' => 'finished',
            'finished_at' => now(),
        ]);

        // Beri tahu Live Monitor admin secara real-time
        ExamSessionUpdated::dispatch($session->fresh(), 'finished');
    }
}
