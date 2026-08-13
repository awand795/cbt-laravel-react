<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StudentExamController;
use App\Http\Controllers\TeacherExamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

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
});

/* ============================================================
   Teacher
   ============================================================ */
Route::middleware(['auth:sanctum', 'role:teacher'])->prefix('teacher')->group(function () {
    Route::get('/subjects', [TeacherExamController::class, 'subjects']);
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
});
