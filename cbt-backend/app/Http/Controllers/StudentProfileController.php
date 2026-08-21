<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamAnswer;
use App\Models\ExamSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StudentProfileController extends Controller
{
    /**
     * GET /api/student/profile
     * Get current student's profile.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('classroom');

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil dimuat.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'class_id' => $user->class_id,
                'class_name' => $user->classroom?->name,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * PUT /api/student/profile
     * Update student's profile (name, email, password).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            $validated = $request->validate([
                'name' => ['sometimes', 'string', 'max:255'],
                'email' => ['sometimes', 'email', 'max:255'],
                'current_password' => ['required_with:password', 'current_password'],
                'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid.',
                'data' => ['errors' => $e->errors()],
            ], 422);
        }

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            if ($validated['email'] !== $user->email) {
                if (\App\Models\User::where('email', $validated['email'])->where('id', '!=', $user->id)->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email sudah digunakan oleh akun lain.',
                        'data' => null,
                    ], 422);
                }
                $user->email = $validated['email'];
            }
        }

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * GET /api/student/exam-history
     * Get all finished exam sessions with scores.
     */
    public function examHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $sessions = ExamSession::query()
            ->with(['exam:id,title,duration_minutes,subject_id', 'exam.subject:id,name'])
            ->where('user_id', $user->id)
            ->where('status', 'finished')
            ->orderByDesc('finished_at')
            ->get();

        $results = $sessions->map(function (ExamSession $session) {
            $exam = $session->exam;
            $answers = $session->answers()->get();

            $pgQuestions = $exam->questions()->where('type', 'pg')->get();
            $pgTotalWeight = (int) $pgQuestions->sum('score');
            $weightById = $pgQuestions->pluck('score', 'id');

            $pgCorrect = 0;
            $pgCorrectWeight = 0;
            foreach ($answers as $answer) {
                if ($answer->option_id && $answer->is_correct) {
                    $pgCorrect++;
                    $pgCorrectWeight += (int) ($weightById[$answer->question_id] ?? 1);
                }
            }

            $score = $pgTotalWeight > 0 ? round(($pgCorrectWeight / $pgTotalWeight) * 100, 2) : null;

            $essayAnswered = $answers->whereNotNull('essay_text')->count();
            $essayGraded = $answers->whereNotNull('essay_text')->whereNotNull('is_correct')->count();

            return [
                'session_id' => $session->id,
                'exam_id' => $exam->id,
                'exam_title' => $exam->title,
                'subject' => $exam->subject?->name,
                'duration_minutes' => $exam->duration_minutes,
                'score' => $score,
                'pg_correct' => $pgCorrect,
                'pg_total' => $pgQuestions->count(),
                'essay_answered' => $essayAnswered,
                'essay_graded' => $essayGraded,
                'total_questions' => $exam->questions()->count(),
                'cheat_count' => $session->cheat_count,
                'started_at' => $session->started_at?->toIso8601String(),
                'finished_at' => $session->finished_at?->toIso8601String(),
                'duration_taken' => $session->started_at && $session->finished_at
                    ? $session->started_at->diffInMinutes($session->finished_at)
                    : null,
            ];
        });

        // Ringkasan
        $totalExams = $results->count();
        $avgScore = $results->whereNotNull('score')->avg('score');
        $bestScore = $results->whereNotNull('score')->max('score');
        $totalCheats = $results->sum('cheat_count');

        return response()->json([
            'success' => true,
            'message' => 'Riwayat ujian berhasil dimuat.',
            'data' => [
                'summary' => [
                    'total_exams' => $totalExams,
                    'average_score' => $avgScore ? round($avgScore, 2) : null,
                    'best_score' => $bestScore,
                    'total_cheats' => $totalCheats,
                ],
                'history' => $results->values(),
            ],
        ]);
    }

    /**
     * GET /api/student/exam-history/{sessionId}
     * Get detailed results for a specific exam session.
     */
    public function examDetail(Request $request, int $sessionId): JsonResponse
    {
        $user = $request->user();

        $session = ExamSession::query()
            ->with(['exam.questions.options', 'answers'])
            ->where('id', $sessionId)
            ->where('user_id', $user->id)
            ->where('status', 'finished')
            ->first();

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi ujian tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $exam = $session->exam;
        $answers = $session->answers->keyBy('question_id');

        $questions = $exam->questions->map(function ($q) use ($answers) {
            $answer = $answers->get($q->id);
            return [
                'question_id' => $q->id,
                'type' => $q->type,
                'question_text' => $q->question_text,
                'score' => $q->score,
                'options' => $q->options->map(fn ($o) => [
                    'id' => $o->id,
                    'option_text' => $o->option_text,
                    'is_correct' => $o->is_correct,
                ])->values(),
                'selected_option_id' => $answer?->option_id,
                'essay_text' => $answer?->essay_text,
                'is_correct' => $answer?->is_correct,
            ];
        });

        // Hitung skor
        $pgQuestions = $exam->questions->where('type', 'pg');
        $pgTotalWeight = (int) $pgQuestions->sum('score');
        $weightById = $pgQuestions->pluck('score', 'id');
        $pgCorrectWeight = 0;
        foreach ($session->answers as $a) {
            if ($a->option_id && $a->is_correct) {
                $pgCorrectWeight += (int) ($weightById[$a->question_id] ?? 1);
            }
        }
        $score = $pgTotalWeight > 0 ? round(($pgCorrectWeight / $pgTotalWeight) * 100, 2) : null;

        return response()->json([
            'success' => true,
            'message' => 'Detail ujian berhasil dimuat.',
            'data' => [
                'session_id' => $session->id,
                'exam_title' => $exam->title,
                'subject' => $exam->subject?->name,
                'score' => $score,
                'started_at' => $session->started_at?->toIso8601String(),
                'finished_at' => $session->finished_at?->toIso8601String(),
                'cheat_count' => $session->cheat_count,
                'questions' => $questions,
            ],
        ]);
    }
}
