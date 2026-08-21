<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Exam;
use App\Models\ExamAnswer;
use App\Models\ExamSession;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * GET /api/admin/analytics/overview
     * System-wide analytics overview.
     */
    public function overview(): JsonResponse
    {
        $totalExams = Exam::count();
        $totalSessions = ExamSession::count();
        $finishedSessions = ExamSession::where('status', 'finished')->count();

        // Average score across all finished sessions
        $avgScore = $this->calculateAverageScore();

        // Score distribution (buckets: 0-20, 21-40, 41-60, 61-80, 81-100)
        $distribution = $this->getScoreDistribution();

        // Exams per subject
        $examsPerSubject = Exam::selectRaw('subject_id, COUNT(*) as count')
            ->groupBy('subject_id')
            ->with('subject:id,name')
            ->get()
            ->pluck('count', 'subject.name');

        // Activity over time (last 30 days)
        $activity = ExamSession::where('created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Analytics overview berhasil dimuat.',
            'data' => [
                'total_exams' => $totalExams,
                'total_sessions' => $totalSessions,
                'finished_sessions' => $finishedSessions,
                'average_score' => $avgScore,
                'score_distribution' => $distribution,
                'exams_per_subject' => $examsPerSubject,
                'activity_last_30_days' => $activity,
            ],
        ]);
    }

    /**
     * GET /api/admin/analytics/exam/{examId}
     * Detailed analytics for a specific exam.
     */
    public function examAnalytics(int $examId): JsonResponse
    {
        $exam = Exam::with(['subject', 'questions', 'sessions'])->findOrFail($examId);

        $sessions = ExamSession::where('exam_id', $examId)
            ->where('status', 'finished')
            ->with('answers')
            ->get();

        // Score calculation per session
        $pgQuestions = $exam->questions->where('type', 'pg');
        $pgTotalWeight = (int) $pgQuestions->sum('score');
        $weightById = $pgQuestions->pluck('score', 'id');

        $scores = $sessions->map(function ($session) use ($weightById, $pgTotalWeight) {
            $answers = $session->answers;
            $pgCorrectWeight = 0;
            $pgCorrect = 0;

            foreach ($answers as $a) {
                if ($a->option_id && $a->is_correct) {
                    $pgCorrect++;
                    $pgCorrectWeight += (int) ($weightById[$a->question_id] ?? 1);
                }
            }

            $score = $pgTotalWeight > 0 ? round(($pgCorrectWeight / $pgTotalWeight) * 100, 2) : null;

            return [
                'user_id' => $session->user_id,
                'score' => $score,
                'pg_correct' => $pgCorrect,
                'cheat_count' => $session->cheat_count,
            ];
        });

        // Statistics
        $validScores = $scores->whereNotNull('score');
        $avgScore = $validScores->avg('score');
        $medianScore = $validScores->pluck('score')->sort()->values();
        $count = $medianScore->count();
        $median = $count > 0 ? ($count % 2 === 0
            ? ($medianScore[$count / 2 - 1] + $medianScore[$count / 2]) / 2
            : $medianScore[(int) ($count / 2)]) : null;

        // Distribution
        $distribution = [
            '0-20' => $validScores->where('score', '<=', 20)->count(),
            '21-40' => $validScores->whereBetween('score', [21, 40])->count(),
            '41-60' => $validScores->whereBetween('score', [41, 60])->count(),
            '61-80' => $validScores->whereBetween('score', [61, 80])->count(),
            '81-100' => $validScores->where('score', '>', 80)->count(),
        ];

        // Question-level analysis: which questions are most missed
        $questionAnalysis = $exam->questions->map(function ($question) use ($sessions) {
            $total = $sessions->count();
            $wrongCount = 0;
            $answerCounts = [];

            foreach ($sessions as $session) {
                $answer = $session->answers->firstWhere('question_id', $question->id);
                if (! $answer) continue;

                if ($question->type === 'pg' && $answer->option_id) {
                    $answerCounts[$answer->option_id] = ($answerCounts[$answer->option_id] ?? 0) + 1;
                    if (! $answer->is_correct) {
                        $wrongCount++;
                    }
                } elseif ($question->type === 'essay') {
                    if ($answer->is_correct === false) {
                        $wrongCount++;
                    } elseif ($answer->is_correct === null) {
                        // not yet graded
                    }
                }
            }

            $difficultyIndex = $total > 0 ? round(1 - ($wrongCount / $total), 2) : null;

            return [
                'question_id' => $question->id,
                'type' => $question->type,
                'question_text' => mb_substr($question->question_text, 0, 80),
                'total_answers' => $total,
                'wrong_count' => $wrongCount,
                'difficulty_index' => $difficultyIndex, // 0 = hardest, 1 = easiest
                'answer_distribution' => $answerCounts,
            ];
        })->sortBy('difficulty_index')->values();

        // Time analysis
        $times = $sessions->filter(fn ($s) => $s->started_at && $s->finished_at)
            ->map(fn ($s) => $s->started_at->diffInMinutes($s->finished_at));

        return response()->json([
            'success' => true,
            'message' => 'Analytics ujian berhasil dimuat.',
            'data' => [
                'exam' => [
                    'id' => $exam->id,
                    'title' => $exam->title,
                    'subject' => $exam->subject?->name,
                    'questions_count' => $exam->questions->count(),
                ],
                'summary' => [
                    'total_participants' => $sessions->count(),
                    'average_score' => $avgScore ? round($avgScore, 2) : null,
                    'median_score' => $median ? round($median, 2) : null,
                    'highest_score' => $validScores->max('score'),
                    'lowest_score' => $validScores->min('score'),
                    'average_time_minutes' => $times->avg() ? round($times->avg(), 1) : null,
                    'total_cheats' => $sessions->sum('cheat_count'),
                ],
                'score_distribution' => $distribution,
                'question_analysis' => $questionAnalysis,
            ],
        ]);
    }

    /**
     * GET /api/admin/analytics/class/{classId}
     * Analytics for a specific class across all exams.
     */
    public function classAnalytics(int $classId): JsonResponse
    {
        $class = Classroom::withCount('students')->findOrFail($classId);

        $studentIds = $class->students()->pluck('id');

        $sessions = ExamSession::query()
            ->with(['exam.questions', 'answers'])
            ->whereIn('user_id', $studentIds)
            ->where('status', 'finished')
            ->get();

        // Group by exam
        $byExam = $sessions->groupBy('exam_id')->map(function ($examSessions, $examId) {
            $exam = $examSessions->first()->exam;
            $pgQuestions = $exam->questions->where('type', 'pg');
            $pgTotalWeight = (int) $pgQuestions->sum('score');
            $weightById = $pgQuestions->pluck('score', 'id');

            $scores = $examSessions->map(function ($s) use ($weightById, $pgTotalWeight) {
                $correctWeight = 0;
                foreach ($s->answers as $a) {
                    if ($a->option_id && $a->is_correct) {
                        $correctWeight += (int) ($weightById[$a->question_id] ?? 1);
                    }
                }
                return $pgTotalWeight > 0 ? round(($correctWeight / $pgTotalWeight) * 100, 2) : null;
            })->filter()->values();

            return [
                'exam_id' => $examId,
                'exam_title' => $exam->title,
                'subject' => $exam->subject?->name,
                'participants' => $examSessions->count(),
                'average_score' => $scores->avg() ? round($scores->avg(), 2) : null,
                'highest' => $scores->max(),
                'lowest' => $scores->min(),
            ];
        })->values();

        // Per-student summary
        $byStudent = $sessions->groupBy('user_id')->map(function ($userSessions) {
            $exam = $userSessions->first()->exam;
            $user = $userSessions->first()->user;

            $scores = $userSessions->map(function ($s) {
                $pgQuestions = $s->exam->questions->where('type', 'pg');
                $pgTotalWeight = (int) $pgQuestions->sum('score');
                $weightById = $pgQuestions->pluck('score', 'id');
                $correctWeight = 0;
                foreach ($s->answers as $a) {
                    if ($a->option_id && $a->is_correct) {
                        $correctWeight += (int) ($weightById[$a->question_id] ?? 1);
                    }
                }
                return $pgTotalWeight > 0 ? round(($correctWeight / $pgTotalWeight) * 100, 2) : null;
            })->filter();

            return [
                'user_id' => $userSessions->first()->user_id,
                'user_name' => $user?->name,
                'exams_taken' => $userSessions->count(),
                'average_score' => $scores->avg() ? round($scores->avg(), 2) : null,
                'best_score' => $scores->max(),
            ];
        })->values()->sortByDesc('average_score')->values();

        return response()->json([
            'success' => true,
            'message' => 'Analytics kelas berhasil dimuat.',
            'data' => [
                'class' => [
                    'id' => $class->id,
                    'name' => $class->name,
                    'students_count' => $class->students_count,
                ],
                'by_exam' => $byExam,
                'by_student' => $byStudent,
            ],
        ]);
    }

    /**
     * GET /api/admin/analytics/subject/{subjectId}
     * Analytics for a specific subject.
     */
    public function subjectAnalytics(int $subjectId): JsonResponse
    {
        $subject = \App\Models\Subject::findOrFail($subjectId);

        $exams = Exam::where('subject_id', $subjectId)->withCount(['questions', 'sessions'])->get();

        $totalSessions = ExamSession::whereIn('exam_id', $exams->pluck('id'))
            ->where('status', 'finished')
            ->count();

        $avgScore = $this->calculateAverageScore(fn ($q) => $q->whereIn('exam_id', $exams->pluck('id')));

        return response()->json([
            'success' => true,
            'message' => 'Analytics mata pelajaran berhasil dimuat.',
            'data' => [
                'subject' => ['id' => $subject->id, 'name' => $subject->name],
                'total_exams' => $exams->count(),
                'total_sessions' => $totalSessions,
                'average_score' => $avgScore,
                'exams' => $exams,
            ],
        ]);
    }

    /* ============================================================
       HELPERS
       ============================================================ */

    private function calculateAverageScore(?callable $scope = null): ?float
    {
        $query = ExamSession::where('status', 'finished');
        if ($scope) {
            $scope($query);
        }

        $sessions = $query->with(['exam.questions', 'answers'])->get();

        $allScores = $sessions->map(function ($session) {
            $pgQuestions = $session->exam->questions->where('type', 'pg');
            $pgTotalWeight = (int) $pgQuestions->sum('score');
            $weightById = $pgQuestions->pluck('score', 'id');

            $correctWeight = 0;
            foreach ($session->answers as $a) {
                if ($a->option_id && $a->is_correct) {
                    $correctWeight += (int) ($weightById[$a->question_id] ?? 1);
                }
            }

            return $pgTotalWeight > 0 ? round(($correctWeight / $pgTotalWeight) * 100, 2) : null;
        })->filter();

        return $allScores->avg() ? round($allScores->avg(), 2) : null;
    }

    private function getScoreDistribution(): array
    {
        $sessions = ExamSession::where('status', 'finished')
            ->with(['exam.questions', 'answers'])
            ->get();

        $scores = $sessions->map(function ($session) {
            $pgQuestions = $session->exam->questions->where('type', 'pg');
            $pgTotalWeight = (int) $pgQuestions->sum('score');
            $weightById = $pgQuestions->pluck('score', 'id');

            $correctWeight = 0;
            foreach ($session->answers as $a) {
                if ($a->option_id && $a->is_correct) {
                    $correctWeight += (int) ($weightById[$a->question_id] ?? 1);
                }
            }

            return $pgTotalWeight > 0 ? round(($correctWeight / $pgTotalWeight) * 100, 2) : null;
        })->filter();

        return [
            '0-20' => $scores->where('<=', 20)->count(),
            '21-40' => $scores->whereBetween(21, 40)->count(),
            '41-60' => $scores->whereBetween(41, 60)->count(),
            '61-80' => $scores->whereBetween(61, 80)->count(),
            '81-100' => $scores->where('>', 80)->count(),
        ];
    }
}
