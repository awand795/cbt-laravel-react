<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GradebookController;
use App\Http\Controllers\ImportExportController;
use App\Http\Controllers\MediaUploadController;
use App\Http\Controllers\QuestionBankController;
use App\Http\Controllers\StudentExamController;
use App\Http\Controllers\StudentProfileController;
use App\Http\Controllers\TeacherExamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');

// Otorisasi berlangganan channel WebSocket (private admin.monitor)
// memakai token Sanctum dari header Authorization, bukan sesi web.
Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})->middleware('auth:sanctum');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Media upload (any authenticated user)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/media/upload', [MediaUploadController::class, 'upload']);
    Route::delete('/media/{path}', [MediaUploadController::class, 'destroy']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

/* ============================================================
   Student
   ============================================================ */
Route::middleware(['auth:sanctum', 'role:student'])->prefix('student')->group(function () {
    Route::get('/exams', [StudentExamController::class, 'index']);
    Route::post('/exams/{id}/start', [StudentExamController::class, 'start']);
    Route::get('/exam-sessions/{id}', [StudentExamController::class, 'show']);
    Route::post('/exam-sessions/{id}/answer', [StudentExamController::class, 'answer']);
    Route::post('/exam-sessions/{id}/submit', [StudentExamController::class, 'submit']);
    Route::post('/exam-sessions/{id}/block', [StudentExamController::class, 'block']);

    // Profile & Exam History
    Route::get('/profile', [StudentProfileController::class, 'show']);
    Route::put('/profile', [StudentProfileController::class, 'update']);
    Route::get('/exam-history', [StudentProfileController::class, 'examHistory']);
    Route::get('/exam-history/{sessionId}', [StudentProfileController::class, 'examDetail']);
});

/* ============================================================
   Teacher
   ============================================================ */
Route::middleware(['auth:sanctum', 'role:teacher'])->prefix('teacher')->group(function () {
    Route::get('/subjects', [TeacherExamController::class, 'subjects']);
    Route::get('/classes', [TeacherExamController::class, 'classes']);
    Route::get('/exams', [TeacherExamController::class, 'index']);
    Route::post('/exams', [TeacherExamController::class, 'store']);
    Route::put('/exams/{id}', [TeacherExamController::class, 'update']);
    Route::delete('/exams/{id}', [TeacherExamController::class, 'destroy']);

    Route::get('/exams/{examId}/questions', [TeacherExamController::class, 'questions']);
    Route::post('/exams/{examId}/questions', [TeacherExamController::class, 'storeQuestion']);
    Route::put('/exams/{examId}/questions/{questionId}', [TeacherExamController::class, 'updateQuestion']);
    Route::delete('/exams/{examId}/questions/{questionId}', [TeacherExamController::class, 'destroyQuestion']);

    Route::get('/exams/{examId}/results', [TeacherExamController::class, 'results']);
    Route::get('/exam-sessions/{sessionId}', [TeacherExamController::class, 'sessionDetail']);
    Route::post('/exam-sessions/{sessionId}/grade/{questionId}', [TeacherExamController::class, 'gradeEssay']);

    // Question Bank (Reusable)
    Route::get('/question-bank', [QuestionBankController::class, 'index']);
    Route::post('/question-bank', [QuestionBankController::class, 'store']);
    Route::put('/question-bank/{id}', [QuestionBankController::class, 'update']);
    Route::delete('/question-bank/{id}', [QuestionBankController::class, 'destroy']);
    Route::post('/question-bank/{id}/add-to-exam/{examId}', [QuestionBankController::class, 'addToExam']);
    Route::get('/question-bank/stats', [QuestionBankController::class, 'stats']);
});

/* ============================================================
   Admin
   ============================================================ */
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/stats', [AdminController::class, 'stats']);

    // Users
    Route::get('/users', [AdminController::class, 'users']);
    Route::post('/users', [AdminController::class, 'storeUser']);
    Route::put('/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{id}', [AdminController::class, 'destroyUser']);

    // Subjects
    Route::get('/subjects', [AdminController::class, 'subjects']);
    Route::post('/subjects', [AdminController::class, 'storeSubject']);
    Route::put('/subjects/{id}', [AdminController::class, 'updateSubject']);
    Route::delete('/subjects/{id}', [AdminController::class, 'destroySubject']);

    // Classes (Kelas)
    Route::get('/classes', [AdminController::class, 'classes']);
    Route::post('/classes', [AdminController::class, 'storeClass']);
    Route::put('/classes/{id}', [AdminController::class, 'updateClass']);
    Route::delete('/classes/{id}', [AdminController::class, 'destroyClass']);

    // Exams
    Route::get('/exams', [AdminController::class, 'exams']);
    Route::post('/exams', [AdminController::class, 'storeExam']);
    Route::put('/exams/{id}', [AdminController::class, 'updateExam']);
    Route::patch('/exams/{id}/status', [AdminController::class, 'updateExamStatus']);
    Route::delete('/exams/{id}', [AdminController::class, 'destroyExam']);

    // Live monitor & blocked sessions
    Route::get('/exams/{id}/live-monitor', [AdminController::class, 'liveMonitor']);
    Route::get('/blocked-sessions', [AdminController::class, 'blockedSessions']);
    Route::post('/exam-sessions/{id}/unblock', [AdminController::class, 'unblock']);

    // Time extension
    Route::post('/exam-sessions/{id}/extend-time', [AdminController::class, 'extendTime']);

    // Import/Export
    Route::post('/import/students', [ImportExportController::class, 'importStudents']);
    Route::post('/import/questions', [ImportExportController::class, 'importQuestions']);
    Route::get('/export/students', [ImportExportController::class, 'exportStudents']);
    Route::get('/export/exams/{examId}/questions', [ImportExportController::class, 'exportQuestions']);
    Route::get('/export/exams/{examId}/results', [ImportExportController::class, 'exportResults']);
    Route::get('/template/students', [ImportExportController::class, 'templateStudents']);
    Route::get('/template/questions', [ImportExportController::class, 'templateQuestions']);

    // Analytics
    Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
    Route::get('/analytics/exam/{examId}', [AnalyticsController::class, 'examAnalytics']);
    Route::get('/analytics/class/{classId}', [AnalyticsController::class, 'classAnalytics']);
    Route::get('/analytics/subject/{subjectId}', [AnalyticsController::class, 'subjectAnalytics']);

    // Gradebook
    Route::get('/gradebook', [GradebookController::class, 'index']);
    Route::get('/gradebook/export', [GradebookController::class, 'export']);
});
