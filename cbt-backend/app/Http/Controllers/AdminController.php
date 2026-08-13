<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    private const ROLES = ['admin', 'teacher', 'student'];

    private const EXAM_STATUSES = ['draft', 'published', 'closed'];

    /* ============================================================
       Dashboard / Stats
       ============================================================ */

    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Statistik dashboard berhasil dimuat.',
            'data' => [
                'students' => User::where('role', 'student')->count(),
                'teachers' => User::where('role', 'teacher')->count(),
                'admins' => User::where('role', 'admin')->count(),
                'subjects' => Subject::count(),
                'exams' => Exam::count(),
                'published_exams' => Exam::where('status', 'published')->count(),
                'sessions' => [
                    'ongoing' => ExamSession::where('status', 'ongoing')->count(),
                    'finished' => ExamSession::where('status', 'finished')->count(),
                    'blocked' => ExamSession::where('status', 'blocked')->count(),
                ],
                'recent_sessions' => ExamSession::query()
                    ->with(['user:id,name', 'exam:id,title'])
                    ->latest('id')
                    ->limit(8)
                    ->get()
                    ->map(fn (ExamSession $s) => [
                        'id' => $s->id,
                        'user_name' => $s->user?->name,
                        'exam_title' => $s->exam?->title,
                        'status' => $s->status,
                        'cheat_count' => $s->cheat_count,
                        'started_at' => $s->started_at?->toIso8601String(),
                    ]),
            ],
        ]);
    }

    /* ============================================================
       Users (Siswa, Guru, Admin)
       ============================================================ */

    public function users(Request $request): JsonResponse
    {
        $role = $request->query('role');

        $query = User::query()->orderBy('name');

        if ($role && in_array($role, self::ROLES, true)) {
            $query->where('role', $role);
        }

        return response()->json([
            'success' => true,
            'message' => 'Daftar pengguna berhasil dimuat.',
            'data' => $query->get()->map(fn (User $u) => $this->userPayload($u)),
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'password' => ['required', 'string', 'min:8'],
                'role' => ['required', Rule::in(self::ROLES)],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil dibuat.',
            'data' => $this->userPayload($user),
        ], 201);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return $this->notFound('Pengguna tidak ditemukan.');
        }

        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
                'password' => ['nullable', 'string', 'min:8'],
                'role' => ['required', Rule::in(self::ROLES)],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        // Jangan biarkan admin terakhir/penyunting menurunkan dirinya sendiri dari role admin
        if ($user->id === $request->user()->id && $validated['role'] !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat mengubah role akun sendiri.',
                'data' => null,
            ], 422);
        }

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = $validated['role'];

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil diperbarui.',
            'data' => $this->userPayload($user->fresh()),
        ]);
    }

    public function destroyUser(Request $request, int $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return $this->notFound('Pengguna tidak ditemukan.');
        }

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat menghapus akun sendiri.',
                'data' => null,
            ], 422);
        }

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus admin terakhir.',
                'data' => null,
            ], 422);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pengguna berhasil dihapus.',
            'data' => null,
        ]);
    }

    /* ============================================================
       Subjects
       ============================================================ */

    public function subjects(): JsonResponse
    {
        $subjects = Subject::query()
            ->withCount('exams')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar mata pelajaran berhasil dimuat.',
            'data' => $subjects->map(fn (Subject $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'code' => $s->code,
                'exams_count' => $s->exams_count,
            ]),
        ]);
    }

    public function storeSubject(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'code' => ['nullable', 'string', 'max:20'],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $subject = Subject::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mata pelajaran berhasil dibuat.',
            'data' => $subject,
        ], 201);
    }

    public function updateSubject(Request $request, int $id): JsonResponse
    {
        $subject = Subject::find($id);

        if (! $subject) {
            return $this->notFound('Mata pelajaran tidak ditemukan.');
        }

        try {
            $validated = $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'code' => ['nullable', 'string', 'max:20'],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $subject->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mata pelajaran berhasil diperbarui.',
            'data' => $subject->fresh(),
        ]);
    }

    public function destroySubject(int $id): JsonResponse
    {
        $subject = Subject::find($id);

        if (! $subject) {
            return $this->notFound('Mata pelajaran tidak ditemukan.');
        }

        if ($subject->exams()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Mata pelajaran masih digunakan oleh ujian. Pindahkan ujian terlebih dahulu.',
                'data' => null,
            ], 422);
        }

        $subject->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mata pelajaran berhasil dihapus.',
            'data' => null,
        ]);
    }

    /* ============================================================
       Exams
       ============================================================ */

    public function exams(): JsonResponse
    {
        $exams = Exam::query()
            ->with(['subject:id,name,code', 'creator:id,name'])
            ->withCount(['questions', 'sessions'])
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar ujian berhasil dimuat.',
            'data' => $exams->map(fn (Exam $e) => $this->examPayload($e)),
        ]);
    }

    public function storeExam(Request $request): JsonResponse
    {
        try {
            $validated = $this->validateExam($request);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $exam = Exam::create([
            ...$validated,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil dibuat.',
            'data' => $this->examPayload($exam->load(['subject:id,name,code', 'creator:id,name'])),
        ], 201);
    }

    public function updateExam(Request $request, int $id): JsonResponse
    {
        $exam = Exam::find($id);

        if (! $exam) {
            return $this->notFound('Ujian tidak ditemukan.');
        }

        try {
            $validated = $this->validateExam($request);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $exam->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil diperbarui.',
            'data' => $this->examPayload($exam->fresh(['subject:id,name,code', 'creator:id,name'])),
        ]);
    }

    public function updateExamStatus(Request $request, int $id): JsonResponse
    {
        $exam = Exam::find($id);

        if (! $exam) {
            return $this->notFound('Ujian tidak ditemukan.');
        }

        try {
            $validated = $request->validate([
                'status' => ['required', Rule::in(self::EXAM_STATUSES)],
            ]);
        } catch (ValidationException $e) {
            return $this->validationError($e);
        }

        $exam->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => "Status ujian diubah menjadi {$validated['status']}.",
            'data' => $this->examPayload($exam->fresh(['subject:id,name,code', 'creator:id,name'])),
        ]);
    }

    public function destroyExam(int $id): JsonResponse
    {
        $exam = Exam::find($id);

        if (! $exam) {
            return $this->notFound('Ujian tidak ditemukan.');
        }

        $exam->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ujian berhasil dihapus.',
            'data' => null,
        ]);
    }

    /* ============================================================
       Live monitoring & blocked sessions
       ============================================================ */

    public function liveMonitor(int $id): JsonResponse
    {
        $exam = Exam::find($id);

        if (! $exam) {
            return $this->notFound('Ujian tidak ditemukan.');
        }

        $sessions = ExamSession::query()
            ->with('user:id,name,email')
            ->where('exam_id', $exam->id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Monitoring ujian berhasil dimuat.',
            'data' => [
                'exam' => $this->examPayload($exam->loadCount(['questions', 'sessions'])),
                'sessions' => $sessions->map(fn (ExamSession $s) => $this->sessionPayload($s)),
            ],
        ]);
    }

    public function blockedSessions(): JsonResponse
    {
        $sessions = ExamSession::query()
            ->with(['user:id,name,email', 'exam:id,title'])
            ->where('status', 'blocked')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Daftar sesi terblokir berhasil dimuat.',
            'data' => $sessions->map(fn (ExamSession $s) => $this->sessionPayload($s)),
        ]);
    }

    public function unblock(int $id): JsonResponse
    {
        $session = ExamSession::query()
            ->with('exam')
            ->where('id', $id)
            ->where('status', 'blocked')
            ->first();

        if (! $session) {
            return response()->json([
                'success' => false,
                'message' => 'Sesi tidak ditemukan atau tidak dalam status terblokir.',
                'data' => null,
            ], 404);
        }

        // Ujian sudah berakhir — tidak ada gunanya membuka blokir
        $exam = $session->exam;
        if ($exam && $exam->end_time && $exam->end_time->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'Ujian sudah berakhir, sesi tidak dapat dibuka kembali.',
                'data' => null,
            ], 422);
        }

        $session->update(['status' => 'ongoing']);

        return response()->json([
            'success' => true,
            'message' => 'Sesi berhasil dibuka kembali. Siswa dapat melanjutkan ujian.',
            'data' => $this->sessionPayload($session->fresh('user:id,name')),
        ]);
    }

    /* ============================================================
       Helpers
       ============================================================ */

    private function validateExam(Request $request): array
    {
        return $request->validate([
            'subject_id' => ['required', 'exists:subjects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'duration_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'start_time' => ['nullable', 'date'],
            'end_time' => ['nullable', 'date', 'after:start_time'],
            'status' => ['nullable', Rule::in(self::EXAM_STATUSES)],
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    private function examPayload(Exam $exam): array
    {
        return [
            'id' => $exam->id,
            'subject_id' => $exam->subject_id,
            'subject' => $exam->subject?->name,
            'subject_code' => $exam->subject?->code,
            'created_by' => $exam->created_by,
            'creator' => $exam->creator?->name,
            'title' => $exam->title,
            'description' => $exam->description,
            'duration_minutes' => $exam->duration_minutes,
            'start_time' => $exam->start_time?->toIso8601String(),
            'end_time' => $exam->end_time?->toIso8601String(),
            'status' => $exam->status,
            'questions_count' => $exam->questions_count ?? $exam->questions()->count(),
            'sessions_count' => $exam->sessions_count ?? $exam->sessions()->count(),
        ];
    }

    private function sessionPayload(ExamSession $session): array
    {
        return [
            'id' => $session->id,
            'exam_id' => $session->exam_id,
            'exam_title' => $session->exam?->title,
            'user_id' => $session->user_id,
            'user_name' => $session->user?->name,
            'user_email' => $session->user?->email,
            'status' => $session->status,
            'cheat_count' => $session->cheat_count,
            'started_at' => $session->started_at?->toIso8601String(),
            'finished_at' => $session->finished_at?->toIso8601String(),
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

    private function notFound(string $message): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
        ], 404);
    }
}
