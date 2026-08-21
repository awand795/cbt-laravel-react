<?php

namespace App\Http\Controllers;

use App\Models\QuestionBank;
use App\Models\QuestionBankOption;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuestionBankController extends Controller
{
    /**
     * GET /api/teacher/question-bank
     * List all questions in the global question bank, filterable by subject/type/difficulty.
     */
    public function index(Request $request): JsonResponse
    {
        $query = QuestionBank::query()
            ->with(['subject:id,name,code', 'options'])
            ->withCount('options');

        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('difficulty')) {
            $query->where('difficulty', $request->difficulty);
        }

        if ($request->has('topic')) {
            $query->where('topic', $request->topic);
        }

        if ($request->has('search')) {
            $query->where('question_text', 'like', "%{$request->search}%");
        }

        $questions = $query->orderByDesc('id')->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Bank soal berhasil dimuat.',
            'data' => $questions,
        ]);
    }

    /**
     * POST /api/teacher/question-bank
     * Add a question to the global question bank.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'subject_id' => ['required', 'exists:subjects,id'],
                'type' => ['required', 'in:pg,essay'],
                'question_text' => ['required', 'string'],
                'media_url' => ['nullable', 'string', 'max:255'],
                'score' => ['nullable', 'integer', 'min:1', 'max:1000'],
                'topic' => ['nullable', 'string', 'max:255'],
                'difficulty' => ['nullable', 'in:easy,medium,hard'],
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

        $question = DB::transaction(function () use ($validated, $request) {
            $q = QuestionBank::create([
                'subject_id' => $validated['subject_id'],
                'created_by' => $request->user()->id,
                'type' => $validated['type'],
                'question_text' => $validated['question_text'],
                'media_url' => $validated['media_url'] ?? null,
                'score' => $validated['score'] ?? 1,
                'topic' => $validated['topic'] ?? null,
                'difficulty' => $validated['difficulty'] ?? 'medium',
            ]);

            if ($validated['type'] === 'pg' && ! empty($validated['options'])) {
                foreach ($validated['options'] as $opt) {
                    $q->options()->create([
                        'option_text' => $opt['option_text'],
                        'is_correct' => (bool) ($opt['is_correct'] ?? false),
                    ]);
                }
            }

            return $q;
        });

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil ditambahkan ke bank soal.',
            'data' => $this->payload($question->fresh('options')),
        ], 201);
    }

    /**
     * PUT /api/teacher/question-bank/{id}
     * Update a question in the global bank.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $question = QuestionBank::find($id);
        if (! $question) {
            return $this->notFound();
        }

        try {
            $validated = $request->validate([
                'subject_id' => ['sometimes', 'exists:subjects,id'],
                'type' => ['required', 'in:pg,essay'],
                'question_text' => ['required', 'string'],
                'media_url' => ['nullable', 'string', 'max:255'],
                'score' => ['nullable', 'integer', 'min:1', 'max:1000'],
                'topic' => ['nullable', 'string', 'max:255'],
                'difficulty' => ['nullable', 'in:easy,medium,hard'],
                'options' => ['nullable', 'array', 'min:2', 'max:10'],
                'options.*.option_text' => ['required_with:options', 'string', 'max:255'],
                'options.*.is_correct' => ['nullable', 'boolean'],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        DB::transaction(function () use ($question, $validated) {
            $question->update([
                'subject_id' => $validated['subject_id'] ?? $question->subject_id,
                'type' => $validated['type'],
                'question_text' => $validated['question_text'],
                'media_url' => $validated['media_url'] ?? null,
                'score' => $validated['score'] ?? $question->score,
                'topic' => $validated['topic'] ?? null,
                'difficulty' => $validated['difficulty'] ?? $question->difficulty,
            ]);

            if ($validated['type'] === 'pg' && ! empty($validated['options'])) {
                $question->options()->delete();
                foreach ($validated['options'] as $opt) {
                    $question->options()->create([
                        'option_text' => $opt['option_text'],
                        'is_correct' => (bool) ($opt['is_correct'] ?? false),
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Soal bank berhasil diperbarui.',
            'data' => $this->payload($question->fresh('options')),
        ]);
    }

    /**
     * DELETE /api/teacher/question-bank/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $question = QuestionBank::find($id);
        if (! $question) {
            return $this->notFound();
        }

        $question->delete();

        return response()->json([
            'success' => true,
            'message' => 'Soal bank berhasil dihapus.',
            'data' => null,
        ]);
    }

    /**
     * POST /api/teacher/question-bank/{id}/add-to-exam/{examId}
     * Copy a question from the bank into an exam.
     */
    public function addToExam(Request $request, int $id, int $examId): JsonResponse
    {
        $bankQuestion = QuestionBank::with('options')->find($id);
        if (! $bankQuestion) {
            return $this->notFound('Soal bank tidak ditemukan.');
        }

        $exam = \App\Models\Exam::where('id', $examId)
            ->where('created_by', $request->user()->id)
            ->first();

        if (! $exam) {
            return $this->notFound('Ujian tidak ditemukan.');
        }

        $question = DB::transaction(function () use ($bankQuestion, $exam) {
            $q = $exam->questions()->create([
                'type' => $bankQuestion->type,
                'question_text' => $bankQuestion->question_text,
                'media_url' => $bankQuestion->media_url,
                'score' => $bankQuestion->score,
                'topic' => $bankQuestion->topic,
                'difficulty' => $bankQuestion->difficulty,
                'is_bank' => true,
            ]);

            foreach ($bankQuestion->options as $opt) {
                $q->options()->create([
                    'option_text' => $opt->option_text,
                    'is_correct' => $opt->is_correct,
                ]);
            }

            return $q;
        });

        return response()->json([
            'success' => true,
            'message' => 'Soal berhasil ditambahkan ke ujian.',
            'data' => [
                'question_id' => $question->id,
                'exam_id' => $exam->id,
            ],
        ], 201);
    }

    /**
     * GET /api/teacher/question-bank/stats
     * Get stats: count per subject, per difficulty, per type.
     */
    public function stats(): JsonResponse
    {
        $total = QuestionBank::count();
        $bySubject = QuestionBank::selectRaw('subject_id, COUNT(*) as count')
            ->groupBy('subject_id')
            ->with('subject:id,name')
            ->get()
            ->pluck('count', 'subject.name');

        $byType = QuestionBank::selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type');

        $byDifficulty = QuestionBank::selectRaw('difficulty, COUNT(*) as count')
            ->groupBy('difficulty')
            ->pluck('count', 'difficulty');

        $topics = QuestionBank::whereNotNull('topic')
            ->selectRaw('topic, COUNT(*) as count')
            ->groupBy('topic')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Statistik bank soal berhasil dimuat.',
            'data' => [
                'total' => $total,
                'by_subject' => $bySubject,
                'by_type' => $byType,
                'by_difficulty' => $byDifficulty,
                'topics' => $topics,
            ],
        ]);
    }

    /* ============================================================
       HELPERS
       ============================================================ */

    private function payload(QuestionBank $q): array
    {
        return [
            'id' => $q->id,
            'subject_id' => $q->subject_id,
            'subject' => $q->subject?->name,
            'type' => $q->type,
            'question_text' => $q->question_text,
            'media_url' => $q->media_url,
            'score' => $q->score,
            'topic' => $q->topic,
            'difficulty' => $q->difficulty,
            'options' => $q->options->map(fn (QuestionBankOption $o) => [
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
            'message' => 'Data tidak valid.',
            'data' => ['errors' => $e->errors()],
        ], 422);
    }

    private function notFound(string $msg = 'Data tidak ditemukan.'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $msg,
            'data' => null,
        ], 404);
    }
}
