# Product Requirements Document (PRD) - Aplikasi CBT Sekolah Pro

## 1. Ringkasan Produk
Aplikasi CBT (Computer Based Test) Sekolah adalah platform ujian digital modern yang dirancang untuk menyelenggarakan ujian dengan tingkat keamanan tinggi (anti-cheat), manajemen yang mudah, dan pengalaman pengguna yang responsif. Sistem ini memisahkan hak akses menjadi tiga peran (role) utama: Admin, Guru, dan Siswa.

## 2. Tujuan
- Menyediakan platform ujian yang mencegah kecurangan secara sistem (fullscreen lock, deteksi perpindahan tab).
- Memudahkan guru dalam mengelola soal dan melakukan penilaian.
- Memudahkan admin dalam mengatur jadwal dan memantau jalannya ujian secara *real-time*.
- Memberikan pengalaman ujian yang lancar bagi siswa, bahkan dengan ketahanan *offline* ringan (auto-save lokal).

## 3. Peran & Hak Akses (Roles)

### 3.1. Admin
Admin bertanggung jawab atas operasional teknis dan jadwal ujian.
- **Manajemen Data Master:** CRUD data Siswa, Guru, Kelas, dan Mata Pelajaran.
- **Manajemen Jadwal Ujian:** Menentukan tanggal, waktu mulai, batas keterlambatan, dan durasi ujian.
- **Monitoring Ujian (Real-time):** Memantau status siswa (Sedang ujian, Selesai, Terblokir, Offline).
- **Buka Blokir (Unfreeze):** Memberikan persetujuan atau token reset kepada siswa yang ujiannya terhenti otomatis akibat melanggar aturan (keluar fullscreen/ganti tab).

### 3.2. Guru
Guru bertanggung jawab atas konten akademik ujian.
- **Manajemen Bank Soal:** Membuat soal berdasarkan mata pelajaran yang diampu. Mendukung format teks, gambar, dan persamaan matematika.
- **Tipe Soal:** Pilihan Ganda (PG) dan Essay.
- **Pengaturan Soal:** Menentukan bobot nilai per soal.
- **Laporan & Penilaian:** Melihat hasil ujian siswa yang diotomatisasi untuk PG, dan melakukan penilaian manual/koreksi untuk soal Essay.

### 3.3. Siswa
Siswa adalah pengguna akhir yang mengikuti ujian.
- **Dashboard Siswa:** Melihat daftar ujian yang tersedia sesuai jadwal dan kelasnya.
- **Pelaksanaan Ujian:** Menjawab soal dengan antarmuka yang intuitif (navigasi soal, ragu-ragu, sisa waktu).
- **Keamanan Ketat (Strict Mode):**
  - Siswa wajib menyetujui dan masuk ke mode *Fullscreen* untuk memulai ujian.
  - Jika siswa menekan tombol `Esc` (keluar fullscreen) atau berpindah tab/aplikasi, **ujian otomatis terkunci (terhenti)**.
  - Layar akan menampilkan peringatan pelanggaran. Siswa tidak bisa melanjutkan sebelum Admin mereset statusnya.
- **Auto-Submit:** Ujian otomatis tersubmit ketika waktu habis.

## 4. Fitur Unggulan (Advanced Features)

1. **Anti-Cheat & Tab Lock Engine**
   - Menggunakan `Fullscreen API` dan `Page Visibility API`.
   - Menonaktifkan klik kanan (Context Menu), Copy, Paste, dan shortcut keyboard (seperti `Ctrl+C`, `Ctrl+V`, `Alt+Tab` preventif di level browser).
2. **Offline Resilience (Auto-Save LocalStorage)**
   - Jawaban siswa disimpan secara berkala ke `localStorage` setiap kali mereka menjawab atau berpindah soal.
   - Jika koneksi internet terputus, siswa tetap bisa menjawab (disimpan lokal). Saat koneksi kembali, sistem akan otomatis melakukan sinkronisasi dengan server (`background sync`).
3. **Randomisasi Soal & Opsi (Dynamic Shuffling)**
   - Mengurangi kemungkinan menyontek antar siswa dengan mengacak urutan soal dan urutan opsi (A, B, C, D) untuk setiap peserta.
4. **Live Exam Dashboard**
   - Admin dan Guru dapat melihat status peserta ujian secara *real-time* tanpa perlu me-refresh halaman (menggunakan Polling atau WebSocket).

## 5. Arsitektur & Teknologi

- **Backend:** Laravel (Versi 11)
  - Arsitektur: RESTful API.
  - Autentikasi: Laravel Sanctum (Token-based auth).
  - Database: MySQL atau PostgreSQL.
- **Frontend:** React JS
  - Build Tool: Vite.
  - State Management: Zustand (Sangat ringan dan cocok untuk menyimpan state ujian, timer, dan status pelanggaran).
  - Data Fetching & Caching: TanStack Query (React Query) untuk manajemen *server state* dan optimasi sinkronisasi jawaban.
  - Routing: TanStack Router atau React Router v6.
  - Styling: Tailwind CSS (memudahkan pembuatan desain modern dan responsif).

## 6. Struktur Database (High-Level)
1. `users` (id, name, email, password, role)
2. `subjects` (id, name)
3. `exams` (id, subject_id, title, duration, start_time, end_time, status)
4. `questions` (id, exam_id, type [pg/essay], content, image)
5. `options` (id, question_id, content, is_correct)
6. `exam_sessions` (id, exam_id, user_id, start_time, end_time, status [ongoing, finished, blocked], cheat_count)
7. `exam_answers` (id, exam_session_id, question_id, option_id, essay_answer, is_correct)
