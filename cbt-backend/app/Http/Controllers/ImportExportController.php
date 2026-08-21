<?php

namespace App\Http\Controllers;

use App\Models\Classroom;
use App\Models\Exam;
use App\Models\ExamAnswer;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\Option;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ImportExportController extends Controller
{
    /* ============================================================
       IMPORT SISWA (CSV)
       ============================================================ */

    public function importStudents(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'File tidak valid.',
                'data' => ['errors' => $e->errors()],
            ], 422);
        }

        $file = $request->file('file');
        $rows = $this->parseCsv($file);

        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $i => $row) {
            $name = trim($row['name'] ?? $row['nama'] ?? '');
            $email = trim($row['email'] ?? '');
            $password = trim($row['password'] ?? $row['password'] ?? '');
            $className = trim($row['class'] ?? $row['kelas'] ?? '');

            if (! $name || ! $email) {
                $skipped++;
                $errors[] = "Baris " . ($i + 2) . ": Nama atau email kosong.";
                continue;
            }

            if (User::where('email', $email)->exists()) {
                $skipped++;
                $errors[] = "Baris " . ($i + 2) . ": Email {$email} sudah ada.";
                continue;
            }

            $classId = null;
            if ($className) {
                $class = Classroom::where('name', $className)->first();
                if (! $class) {
                    $class = Classroom::create(['name' => $className]);
                }
                $classId = $class->id;
            }

            User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password ?: 'password123'),
                'role' => 'student',
                'class_id' => $classId,
            ]);

            $imported++;
        }

        return response()->json([
            'success' => true,
            'message' => "Import selesai: {$imported} siswa diimport, {$skipped} dilewati.",
            'data' => [
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors,
            ],
        ]);
    }

    /* ============================================================
       IMPORT SOAL (CSV)
       ============================================================ */

    public function importQuestions(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
                'exam_id' => ['required', 'integer', 'exists:exams,id'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid.',
                'data' => ['errors' => $e->errors()],
            ], 422);
        }

        $exam = Exam::findOrFail($request->exam_id);
        $file = $request->file('file');
        $rows = $this->parseCsv($file);

        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($rows as $i => $row) {
            $type = strtolower(trim($row['type'] ?? $row['tipe'] ?? 'pg'));
            $questionText = trim($row['question'] ?? $row['soal'] ?? '');
            $score = (int) ($row['score'] ?? $row['bobot'] ?? 1);
            $topic = trim($row['topic'] ?? $row['topik'] ?? '');
            $difficulty = strtolower(trim($row['difficulty'] ?? $row['kesulitan'] ?? 'medium'));

            if (! $questionText) {
                $skipped++;
                $errors[] = "Baris " . ($i + 2) . ": Teks soal kosong.";
                continue;
            }

            if (! in_array($type, ['pg', 'essay'])) {
                $type = 'pg';
            }

            if (! in_array($difficulty, ['easy', 'medium', 'hard'])) {
                $difficulty = 'medium';
            }

            $question = Question::create([
                'exam_id' => $exam->id,
                'type' => $type,
                'question_text' => $questionText,
                'score' => max(1, $score),
                'topic' => $topic ?: null,
                'difficulty' => $difficulty,
            ]);

            // Parse opsi PG: option_a, option_b, option_c, option_d, option_e, correct
            if ($type === 'pg') {
                $correctAnswer = strtolower(trim($row['correct'] ?? $row['jawaban'] ?? ''));
                $optionLabels = ['a', 'b', 'c', 'd', 'e'];

                foreach ($optionLabels as $label) {
                    $optionText = trim($row["option_{$label}"] ?? $row["opsi_{$label}"] ?? '');
                    if ($optionText) {
                        $question->options()->create([
                            'option_text' => $optionText,
                            'is_correct' => $label === $correctAnswer,
                        ]);
                    }
                }
            }

            $imported++;
        }

        return response()->json([
            'success' => true,
            'message' => "Import selesai: {$imported} soal diimport, {$skipped} dilewati.",
            'data' => [
                'imported' => $imported,
                'skipped' => $skipped,
                'errors' => $errors,
            ],
        ]);
    }

    /* ============================================================
       EXPORT SISWA (CSV)
       ============================================================ */

    public function exportStudents(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = User::where('role', 'student')->with('classroom')->orderBy('name');

        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        $students = $query->get();

        return response()->streamDownload(function () use ($students) {
            $handle = fopen('php://output', 'w');

            // Header
            fputcsv($handle, ['ID', 'Nama', 'Email', 'Kelas', 'Dibuat']);

            foreach ($students as $s) {
                fputcsv($handle, [
                    $s->id,
                    $s->name,
                    $s->email,
                    $s->classroom?->name ?? '',
                    $s->created_at?->format('Y-m-d H:i:s') ?? '',
                ]);
            }

            fclose($handle);
        }, 'siswa_export_' . date('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /* ============================================================
       EXPORT SOAL (CSV)
       ============================================================ */

    public function exportQuestions(int $examId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $exam = Exam::with(['questions.options'])->findOrFail($examId);

        return response()->streamDownload(function () use ($exam) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['ID', 'Tipe', 'Soal', 'Bobot', 'Topik', 'Kesulitan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Opsi E', 'Jawaban Benar']);

            foreach ($exam->questions as $q) {
                $options = $q->options->values();
                $correct = '';

                $opts = [];
                foreach ($options as $idx => $opt) {
                    $label = chr(65 + $idx); // A, B, C, D, E
                    $opts["option_{$label}"] = $opt->option_text;
                    if ($opt->is_correct) {
                        $correct = strtolower($label);
                    }
                }

                fputcsv($handle, [
                    $q->id,
                    $q->type,
                    $q->question_text,
                    $q->score,
                    $q->topic ?? '',
                    $q->difficulty ?? 'medium',
                    $opts['option_a'] ?? '',
                    $opts['option_b'] ?? '',
                    $opts['option_c'] ?? '',
                    $opts['option_d'] ?? '',
                    $opts['option_e'] ?? '',
                    $correct,
                ]);
            }

            fclose($handle);
        }, "soal_{$exam->title}_export_" . date('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /* ============================================================
       EXPORT HASIL UJIAN (CSV)
       ============================================================ */

    public function exportResults(int $examId): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $exam = Exam::with(['sessions.user', 'sessions.answers', 'questions'])->findOrFail($examId);

        $pgQuestions = $exam->questions->where('type', 'pg');
        $pgTotalWeight = (int) $pgQuestions->sum('score');
        $weightById = $pgQuestions->pluck('score', 'id');

        return response()->streamDownload(function () use ($exam, $pgTotalWeight, $weightById) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['ID Sesi', 'Nama Siswa', 'Email', 'Status', 'Pelanggaran', 'Mulai', 'Selesai', 'Benar PG', 'Total PG', 'Nilai PG (%)']);

            foreach ($exam->sessions()->with(['user', 'answers'])->where('status', 'finished')->get() as $session) {
                $answers = $session->answers;
                $pgCorrect = $answers->where('is_correct', true)->whereIn('question_id', $weightById->keys())->count();
                $pgCorrectWeight = (int) $answers->where('is_correct', true)->whereIn('question_id', $weightById->keys())
                    ->sum(fn ($a) => (int) ($weightById[$a->question_id] ?? 1));
                $score = $pgTotalWeight > 0 ? round(($pgCorrectWeight / $pgTotalWeight) * 100, 2) : null;

                fputcsv($handle, [
                    $session->id,
                    $session->user?->name ?? '',
                    $session->user?->email ?? '',
                    $session->status,
                    $session->cheat_count,
                    $session->started_at?->format('Y-m-d H:i:s') ?? '',
                    $session->finished_at?->format('Y-m-d H:i:s') ?? '',
                    $pgCorrect,
                    $pgQuestions->count(),
                    $score ?? '-',
                ]);
            }

            fclose($handle);
        }, "hasil_{$exam->title}_export_" . date('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /* ============================================================
       TEMPLATE CSV (download template untuk import)
       ============================================================ */

    public function templateStudents(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['nama', 'email', 'password', 'kelas']);
            fputcsv($handle, ['Budi Santoso', 'budi@student.sch.id', 'password123', 'IX-A']);
            fputcsv($handle, ['Siti Aminah', 'siti@student.sch.id', 'password123', 'IX-B']);
            fclose($handle);
        }, 'template_siswa.csv', ['Content-Type' => 'text/csv']);
    }

    public function templateQuestions(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['tipe', 'soal', 'bobot', 'topik', 'kesulitan', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'jawaban']);
            fputcsv($handle, ['pg', '2 + 2 = ?', 1, 'Penjumlahan', 'easy', '1', '2', '3', '4', '5', 'd']);
            fputcsv($handle, ['essay', 'Jelaskan apa itu fotosintesis', 5, 'Biologi', 'medium']);
            fclose($handle);
        }, 'template_soal.csv', ['Content-Type' => 'text/csv']);
    }

    /* ============================================================
       HELPERS
       ============================================================ */

    private function parseCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if (! $handle) {
            return [];
        }

        $headers = fgetcsv($handle);
        if (! $headers) {
            return [];
        }

        // Normalize headers
        $headers = array_map(fn ($h) => strtolower(trim(str_replace(' ', '_', $h))), $headers);

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) === count($headers)) {
                $rows[] = array_combine($headers, $row);
            }
        }

        fclose($handle);
        return $rows;
    }
}
