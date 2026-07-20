# Skill / Panduan Backend: Laravel API untuk CBT

Dokumen ini adalah panduan teknis (skill) untuk mengimplementasikan Backend aplikasi CBT menggunakan Laravel.

## 1. Persiapan & Instalasi
- **Inisialisasi Project:** `composer create-project laravel/laravel cbt-api`
- **Setup Auth:** Gunakan Laravel Sanctum untuk API Token.
  ```bash
  composer require laravel/sanctum
  php artisan install:api
  ```

## 2. Struktur Database (Migration & Models)
Buat Model dan Migration berikut:
- **User:** Tambahkan kolom `role` (enum: 'admin', 'teacher', 'student').
- **Subject:** `name`, `code`.
- **Exam:** `subject_id`, `title`, `description`, `start_time`, `end_time`, `duration_minutes`.
- **Question:** `exam_id`, `type` (pg/essay), `question_text`, `media_url`.
- **Option:** `question_id`, `option_text`, `is_correct` (boolean).
- **ExamSession:** `exam_id`, `user_id`, `started_at`, `finished_at`, `status` (ongoing, finished, blocked).
- **ExamAnswer:** `exam_session_id`, `question_id`, `option_id`, `essay_text`.

## 3. Desain API (Endpoints)

### Auth
- `POST /api/login` -> Return Token + User Data.
- `POST /api/logout` -> Revoke Token.

### Admin
- `CRUD /api/admin/users`
- `CRUD /api/admin/exams`
- `POST /api/admin/exam-sessions/{id}/unblock` -> Mereset status sesi ujian yang terblokir (blocked) kembali ke (ongoing).
- `GET /api/admin/exams/{id}/live-monitor` -> Melihat status real-time peserta.

### Guru (Teacher)
- `CRUD /api/teacher/exams` (hanya ujian miliknya/mapelnya).
- `CRUD /api/teacher/exams/{id}/questions` -> Manajemen soal.
- `GET /api/teacher/exams/{id}/results` -> Melihat nilai siswa.

### Siswa (Student)
- `GET /api/student/exams` -> List ujian yang tersedia saat ini.
- `POST /api/student/exams/{id}/start` -> Memulai sesi ujian.
- `GET /api/student/exam-sessions/{id}` -> Mengambil soal ujian (diacak).
- `POST /api/student/exam-sessions/{id}/answer` -> Menyimpan jawaban per soal (dipanggil setiap ada perubahan jawaban).
- `POST /api/student/exam-sessions/{id}/submit` -> Menyelesaikan ujian.
- `POST /api/student/exam-sessions/{id}/block` -> Dipanggil oleh frontend jika terdeteksi kecurangan (keluar fullscreen/ganti tab).

## 4. Keamanan & Validasi
- **Middleware Role:** Buat middleware khusus untuk memastikan endpoint admin hanya diakses role `admin`, dst.
- **Validasi Waktu:** Di endpoint `/answer` dan `/submit`, selalu cek apakah waktu ujian (berdasarkan server time) masih valid.
- **Pencegahan Akses Ganda:** Pastikan satu `user_id` hanya memiliki satu `ExamSession` aktif di waktu yang sama.

## 5. Standar Output Response
Selalu gunakan standar response JSON yang konsisten, contoh:
```json
{
  "success": true,
  "message": "Jawaban berhasil disimpan",
  "data": { ... }
}
```
