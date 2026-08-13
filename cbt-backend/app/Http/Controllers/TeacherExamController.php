<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Exam;
use App\Models\ExamAnswer;
use App\Models\ExamSession;
use App\Models\Option;
use App\Models\Question;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeacherExamController extends Controller
{
    /* ============================================================
       Exams (hanya milik guru bersangkutan)
       ============================================================ */

    public function index(Request $request): JsonResponse
    {
        $exams = Exam::query()
            ->with(['subject:id,name,code', 'classrooms:id,name,code'])
            ->withCount(['questions', 'sessions'])
            ->where('created_by', $request->user()->id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar ujian berhasil dimuat.',
            'data' => $exams->map(fn (Exam $e) => $this->examPayload($e)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $this->validateExam($request);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $classIds = $validated['class_ids'] ?? [];
        unset($validated['class_ids']);

        $exam = Exam::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);
        $exam->classrooms()->sync($classIds);

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil dibuat.',
            'data' => $this->examPayload($exam->load(['subject:id,name,code', 'classrooms:id,name,code'])),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $exam = $this->findOwnExam($request, $id);

        if (! $exam) {
            return $this->notFound();
        }

        try {
            $validated = $this->validateExam($request);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $classIds = $validated['class_ids'] ?? [];
        unset($validated['class_ids']);

        $exam->update($validated);
        $exam->classrooms()->sync($classIds);

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil diperbarui.',
            'data' => $this->examPayload($exam->fresh(['subject:id,name,code', 'classrooms:id,name,code'])),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $exam = $this->findOwnExam($request, $id);

        if (! $exam) {
            return $this->notFound();
        }

        $exam->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil dihapus.',
            'data' => null,
        ]);
    }

    /* ============================================================
       Subjects & Classes (dibaca guru untuk mengisi form ujian)
       ============================================================ */

    public function subjects(): JsonResponse
    {
        $subjects = Subject::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json([
            'success' => true,
            'message' => 'Daftar mata pelajaran berhasil dimuat.',
            'data' => $subjects,
        ]);
    }

    public function classes(): JsonResponse
    {
        $classes = Classroom::query()
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json([
            'success' => true,
            'message' => 'Daftar kelas berhasil dimuat.',
            'data' => $classes,
        ]);
    }

    /* ============================================================
       Bank Soal
       ============================================================ */

    public function questions(Request $request, int $examId): JsonResponse
    {
        $exam = $this->findOwnExam($request, $examId);

        if (! $exam) {
            return $this->notFound();
        }

        $questions = Question::query()
            ->with('options')
            ->where('exam_id', $exam->id)
            ->orderBy('id')
            ->get()
            ->map(fn (Question $q) => $this->questionPayload($q));

        return response()->json([
            'success' => true,
            'message' => 'Bank soal berhasil dimuat.',
            'data' => [
                'exam' => $this->examPayload($exam->loadCount('sessions')),
                'questions' => $questions,
            ],
        ]);
    }

    public function storeQuestion(Request $request, int $examId): JsonResponse
    {
        $exam = $this->findOwnExam($request, $examId);

        if (! $exam) {
            return $this->notFound();
        }

        try {
            $validated = $request->validate([
                'type' => ['required', Rule::in(['pg', 'essay'])],
                'question_text' => ['required', 'string'],
                'media_url' => ['nullable', 'string', 'max:255'],
                'options' => ['nullable', 'array', 'min:2', 'max:10'],
                'options.*.option_text' => ['required_with:options', 'string', 'max:255'],
                'options.*.is_correct' => ['nullable', 'boolean'],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        if ($validated['type'] === 'pg' && empty($validated['options'])) {
            return response()->json([
                'success' => false,
                'message' => 'Soal pilihan ganda wajib memiliki opsi jawaban.',
                'data' => null,
            ], 422);
        }

        if ($validated['type'] === 'essay') {
            $validated['options'] = [];
        }

        $question = Question::create([
            'exam_id' => $exam->id,
            'type' => $validated['type'],
            'question_text' => $validated['question_text'],
            'media_url' => $validated['media_url'] ?? null,
        ]);

        foreach ($validated['options'] ?? [] as $opt) {
            $question->options()->create([
                'option_text' => $opt['option_text'],
                'is_correct' => (bool) ($opt['is_correct'] ?? false),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil ditambahkan.',
            'data' => $this->questionPayload($question->load('options')),
        ], 201);
    }

    public function updateQuestion(Request $request, int $examId, int $questionId): JsonResponse
    {
        $exam = $this->findOwnExam($request, $examId);

        if (! $exam) {
            return $this->notFound();
        }

        $question = Question::query()
            ->where('id', $questionId)
            ->where('exam_id', $exam->id)
            ->first();

        if (! $question) {
            return $this->notFound('Soal tidak ditemukan.');
        }

        try {
            $validated = $request->validate([
                'type' => ['required', Rule::in(['pg', 'essay'])],
                'question_text' => ['required', 'string'],
                'media_url' => ['nullable', 'string', 'max:255'],
                'options' => ['nullable', 'array', 'min:2', 'max:10'],
                'options.*.option_text' => ['required_with:options', 'string', 'max:255'],
                'options.*.is_correct' => ['nullable', 'boolean'],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        if ($validated['type'] === 'pg' && empty($validated['options'])) {
            return response()->json([
                'success' => false,
                'message' => 'Soal pilihan ganda wajib memiliki opsi jawaban.',
                'data' => null,
            ], 422);
        }

        $question->update([
            'type' => $validated['type'],
            'question_text' => $validated['question_text'],
            'media_url' => $validated['media_url'] ?? null,
        ]);

        // Ganti seluruh opsi lama dengan opsi baru (cara paling sederhana & aman)
        $question->options()->delete();

        if ($validated['type'] === 'pg') {
            foreach ($validated['options'] as $opt) {
                $question->options()->create([
                    'option_text' => $opt['option_text'],
                    'is_correct' => (bool) ($opt['is_correct'] ?? false),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil diperbarui.',
            'data' => $this->questionPayload($question->fresh('options')),
        ]);
    }

    public function destroyQuestion(Request $request, int $examId, int $questionId): JsonResponse
    {
        $exam = $this->findOwnExam($request, $examId);

        if (! $exam) {
            return $this->notFound();
        }

        $question = Question::query()
            ->where('id', $questionId)
            ->where('exam_id', $exam->id)
            ->first();

        if (! $question) {
            return $this->notFound('Soal tidak ditemukan.');
        }

        $question->delete();

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil dihapus.',
            'data' => null,
        ]);
    }

    /* ============================================================
       Hasil & Penilaian
       ============================================================ */

    public function results(Request $request, int $examId): JsonResponse
    {
        $exam = $this->findOwnExam($request, $examId);

        if (! $exam) {
            return $this->notFound();
        }

        $sessions = ExamSession::query()
            ->with('user:id,name,email')
            ->where('exam_id', $exam->id)
            ->where('status', 'finished')
            ->orderByDesc('id')
            ->get();

        // Hitung skor ulang dari jawaban tersimpan (aman & konsisten)
        $pgTotal = $exam->questions()->where('type', 'pg')->count();

        $data = $sessions->map(function (ExamSession $s) use ($pgTotal) {
            $answers = $s->answers()->get();
            $pgCorrect = $answers->whereNotNull('is_correct')->where('is_correct', true)
                ->whereIn('question_id', $this->pgQuestionIds($s))
                ->count();
            $essayAnswered = $answers->whereNotNull('essay_text')->count();
            $essayGraded = $answers->whereNotNull('essay_text')->whereNotNull('is_correct')->count();
            $score = $pgTotal > 0 ? round(($pgCorrect / $pgTotal) * 100, 2) : null;

            return [
                'session_id' => $s->id,
                'user_id' => $s->user_id,
                'user_name' => $s->user?->name,
                'user_email' => $s->user?->email,
                'status' => $s->status,
                'cheat_count' => $s->cheat_count,
                'started_at' => $s->started_at?->toIso8601String(),
                'finished_at' => $s->finished_at?->toIso8601String(),
                'score' => $score,
                'pg_correct' => $pgCorrect,
                'pg_total' => $pgTotal,
                'essay_answered' => $essayAnswered,
                'essay_graded' => $essayGraded,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Hasil ujian berhasil dimuat.',
            'data' => [
                'exam' => $this->examPayload($exam->loadCount(['questions', 'sessions'])),
                'results' => $data->values(),
            ],
        ]);
    }

    public function sessionDetail(Request $request, int $sessionId): JsonResponse
    {
        $session = ExamSession::query()
            ->with(['exam:id,title,created_by', 'user:id,name,email'])
            ->where('id', $sessionId)
            ->first();

        if (! $session || $session->exam->created_by !== $request->user()->id) {
            return $this->notFound('Sesi tidak ditemukan.');
        }

        $questions = $session->exam->questions()
            ->with('options')
            ->get()
            ->map(function (Question $q) use ($session) {
                $answer = ExamAnswer::query()
                    ->where('exam_session_id', $session->id)
                    ->where('question_id', $q->id)
                    ->first();

                return [
                    'question_id' => $q->id,
                    'type' => $q->type,
                    'question_text' => $q->question_text,
                    'options' => $q->options->map(fn (Option $o) => [
                        'id' => $o->id,
                        'option_text' => $o->option_text,
                        'is_correct' => $o->is_correct,
                    ]),
                    'answer_option_id' => $answer?->option_id,
                    'answer_essay_text' => $answer?->essay_text,
                    'is_correct' => $answer?->is_correct,
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Detail jawaban siswa berhasil dimuat.',
            'data' => [
                'session' => [
                    'id' => $session->id,
                    'user_name' => $session->user?->name,
                    'user_email' => $session->user?->email,
                    'exam_title' => $session->exam->title,
                    'started_at' => $session->started_at?->toIso8601String(),
                    'finished_at' => $session->finished_at?->toIso8601String(),
                    'cheat_count' => $session->cheat_count,
                ],
                'questions' => $questions,
            ],
        ]);
    }

    public function gradeEssay(Request $request, int $sessionId, int $questionId): JsonResponse
    {
        $session = ExamSession::query()
            ->with(['exam:id,created_by'])
            ->where('id', $sessionId)
            ->first();

        if (! $session || $session->exam->created_by !== $request->user()->id) {
            return $this->notFound('Sesi tidak ditemukan.');
        }

        try {
            $validated = $request->validate([
                'is_correct' => ['required', 'boolean'],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $answer = ExamAnswer::query()
            ->where('exam_session_id', $session->id)
            ->where('question_id', $questionId)
            ->first();

        if (! $answer) {
            return $this->notFound('Jawaban essay tidak ditemukan.');
        }

        $answer->update(['is_correct' => $validated['is_correct']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_correct']
                ? 'Jawaban essay ditandai benar.'
                : 'Jawaban essay ditandai salah.',
            'data' => [
                'session_id' => $session->id,
                'question_id' => $questionId,
                'is_correct' => $answer->is_correct,
            ],
        ]);
    }

    /* ============================================================
       Helpers
       ============================================================ */

    private function findOwnExam(Request $request, int $id): ?Exam
    {
        return Exam::query()
            ->where('id', $id)
            ->where('created_by', $request->user()->id)
            ->first();
    }

    private function pgQuestionIds(ExamSession $session): array
    {
        return $session->exam->questions()
            ->where('type', 'pg')
            ->pluck('id')
            ->all();
    }

    private function validateExam(Request $request): array
    {
        return $request->validate([
            'subject_id' => ['required', 'exists:subjects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'start_time' => ['nullable', 'date'],
            'end_time' => ['nullable', 'date', 'after:start_time'],
            'status' => ['nullable', Rule::in(['draft', 'published', 'closed'])],
            'class_ids' => ['nullable', 'array'],
            'class_ids.*' => ['integer', 'exists:classes,id'],
        ]);
    }

    private function examPayload(Exam $exam): array
    {
        return [
            'id' => $exam->id,
            'subject_id' => $exam->subject_id,
            'subject' => $exam->subject?->name,
            'subject_code' => $exam->subject?->code,
            'title' => $exam->title,
            'description' => $exam->description,
            'duration_minutes' => $exam->duration_minutes,
            'start_time' => $exam->start_time?->toIso8601String(),
            'end_time' => $exam->end_time?->toIso8601String(),
            'status' => $exam->status,
            'class_ids' => $exam->classrooms->pluck('id')->all(),
            'class_names' => $exam->classrooms->pluck('name')->all(),
            'questions_count' => $exam->questions_count ?? $exam->questions()->count(),
            'sessions_count' => $exam->sessions_count ?? $exam->sessions()->count(),
        ];
    }

    private function questionPayload(Question $question): array
    {
        return [
            'id' => $question->id,
            'type' => $question->type,
            'question_text' => $question->question_text,
            'media_url' => $question->media_url,
            'options' => $question->options->map(fn (Option $o) => [
                'id' => $o->id,
                'option_text' => $o->option_text,
                'is_correct' => $o->is_correct,
            ])->values(),
        ];
    }

    private function validationError(ValidationException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Data yang dikirim tidak valid.',
            'data' => ['errors' => $e->errors()],
        ], 422);
    }

    private function notFound(string $message = 'Data tidak ditemukan.'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
        ], 404);
    }
}
