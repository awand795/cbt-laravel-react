<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradebookController extends Controller
{
    /**
     * GET /api/admin/gradebook
     * Consolidated gradebook: all students x all exams, grouped by class.
     */
    public function index(Request $request): JsonResponse
    {
        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');

        $classesQuery = Classroom::query()->withCount('students');

        if ($classId) {
            $classesQuery->where('id', $classId);
        }

        $classes = $classesQuery->orderBy('name')->get();

        $gradebook = $classes->map(function (Classroom $class) use ($subjectId) {
            $students = $class->students()->get(['id', 'name', 'email']);

            $examsQuery = Exam::query()
                ->whereHas('classrooms', fn ($q) => $q->where('classes.id', $class->id))
                ->with('subject:id,name');

            if ($subjectId) {
                $examsQuery->where('subject_id', $subjectId);
            }

            $exams = $examsQuery->get(['id', 'title', 'subject_id']);

            $studentGrades = $students->map(function (User $student) use ($exams, $class) {
                $sessions = ExamSession::query()
                    ->with(['exam.questions', 'answers'])
                    ->where('user_id', $student->id)
                    ->whereIn('exam_id', $exams->pluck('id'))
                    ->where('status', 'finished')
                    ->get();

                $grades = $exams->map(function (Exam $exam) use ($sessions) {
                    $session = $sessions->firstWhere('exam_id', $exam->id);
                    if (! $session) {
                        return ['exam_id' => $exam->id, 'score' => null, 'status' => 'belum'];
                    }

                    $pgQuestions = $exam->questions->where('type', 'pg');
                    $pgTotalWeight = (int) $pgQuestions->sum('score');
                    $weightById = $pgQuestions->pluck('score', 'id');

                    $correctWeight = 0;
                    foreach ($session->answers as $a) {
                        if ($a->option_id && $a->is_correct) {
                            $correctWeight += (int) ($weightById[$a->question_id] ?? 1);
                        }
                    }

                    $score = $pgTotalWeight > 0 ? round(($correctWeight / $pgTotalWeight) * 100, 2) : null;

                    return [
                        'exam_id' => $exam->id,
                        'score' => $score,
                        'status' => 'selesai',
                    ];
                })->keyBy('exam_id');

                $validScores = $grades->pluck('score')->filter();
                $avgScore = $validScores->avg();

                return [
                    'user_id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'grades' => $grades->values(),
                    'average_score' => $avgScore ? round($avgScore, 2) : null,
                    'exams_taken' => $validScores->count(),
                ];
            });

            // Class average
            $classAvg = $studentGrades->pluck('average_score')->filter()->avg();

            return [
                'class_id' => $class->id,
                'class_name' => $class->name,
                'students_count' => $students->count(),
                'class_average' => $classAvg ? round($classAvg, 2) : null,
                'exams' => $exams->map(fn ($e) => ['id' => $e->id, 'title' => $e->title, 'subject' => $e->subject?->name]),
                'students' => $studentGrades,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Buku nilai berhasil dimuat.',
            'data' => $gradebook,
        ]);
    }

    /**
     * GET /api/admin/gradebook/export
     * Export gradebook as CSV.
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $classId = $request->query('class_id');

        $classesQuery = Classroom::query();
        if ($classId) {
            $classesQuery->where('id', $classId);
        }
        $classes = $classesQuery->get();

        return response()->streamDownload(function () use ($classes) {
            $handle = fopen('php://output', 'w');

            // Header
            fputcsv($handle, ['Kelas', 'Nama Siswa', 'Email', 'Rata-rata Nilai']);

            foreach ($classes as $class) {
                $students = $class->students()->get();

                foreach ($students as $student) {
                    $sessions = ExamSession::query()
                        ->with(['exam.questions', 'answers'])
                        ->where('user_id', $student->id)
                        ->whereHas('exam.classrooms', fn ($q) => $q->where('classes.id', $class->id))
                        ->where('status', 'finished')
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

                    $avg = $scores->avg();

                    fputcsv($handle, [
                        $class->name,
                        $student->name,
                        $student->email,
                        $avg ? round($avg, 2) : '-',
                    ]);
                }
            }

            fclose($handle);
        }, 'buku_nilai_export_' . date('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
