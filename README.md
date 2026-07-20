# 🎓 Aplikasi CBT Sekolah (Computer Based Test)

Aplikasi ujian berbasis komputer modern dengan sistem keamanan tingkat tinggi (*Anti-Cheat*). Sistem ini dibangun dengan memisahkan antarmuka (Frontend) dan logika (Backend) untuk memberikan pengalaman pengguna yang sangat cepat dan interaktif.

## 🚀 Fitur Utama
- **Multi-Role:** Sistem hak akses untuk **Admin** (Pengelola), **Guru** (Pembuat Soal), dan **Siswa** (Peserta).
- **Sistem Keamanan Ujian (Anti-Cheat):**
  - Siswa wajib masuk ke mode *Fullscreen* untuk ujian.
  - Ujian akan terblokir otomatis (*freeze*) jika terdeteksi siswa menekan `Esc`, berpindah *tab* browser, atau membuka aplikasi lain.
  - Membutuhkan reset dari Pengawas/Admin untuk dapat melanjutkan ujian yang terblokir.
- **Ketahanan Jaringan (Offline Resilience):** Jawaban secara berkala di-simpan (*auto-save*) di dalam memori *browser* lokal, lalu disinkronisasi ke *server*, mencegah hilangnya jawaban akibat putus koneksi.
- **Soal dan Jawaban Dinamis:** Soal dan urutan opsi Pilihan Ganda (PG) diacak untuk setiap peserta.

## 🛠️ Teknologi (Tech Stack)
* **Backend:** Laravel 13, PHP 8.3, PostgreSQL, Laravel Sanctum (Token Auth)
* **Frontend:** React JS, Vite, Zustand (State Management), TanStack React Query (Data Fetching), Tailwind CSS v4 (Styling)

## 📂 Struktur Repositori
- `cbt-backend/` - Kode *Backend* (API Laravel).
- `cbt-frontend/` - Kode *Frontend* (React SPA).

---

## ⚙️ Persyaratan Sistem (Prerequisites)
Pastikan komputer Anda sudah memiliki perangkat lunak berikut:
- **PHP** (Minimal v8.3) & **Composer**
- **Node.js** & **NPM**
- **PostgreSQL**

---

## 🔧 Instalasi dan Konfigurasi

### 1. Setup Backend (Laravel)
Buka terminal dan eksekusi perintah berikut:
```bash
# Masuk ke folder backend
cd cbt-backend

# 1. Pastikan seluruh dependensi PHP terinstal
composer install

# 2. Sesuaikan kredensial Database di file .env (PostgreSQL)
# (Secara default sudah diatur ke DB cbt_db, user postgres, password postgres)

# 3. Jalankan Migrasi Struktur Tabel dan isi Data Dummy
php artisan migrate:fresh --seed
```
*Catatan Data Dummy:* Script seeder telah menyediakan 3 akun untuk percobaan awal:
- **Admin:** `admin@cbt.com`
- **Guru:** `guru@cbt.com`
- **Siswa:** `siswa@cbt.com`
*(Password untuk semua akun: `password`)*

### 2. Setup Frontend (React)
Buka *tab* terminal baru dan jalankan langkah berikut:
```bash
# Masuk ke folder frontend
cd cbt-frontend

# Instal seluruh package NPM
npm install
```

---

## 💻 Cara Menjalankan Aplikasi Secara Lokal

Anda harus menjalankan kedua server (*backend* dan *frontend*) secara bersamaan.

**Terminal 1 (Menjalankan API Backend):**
```bash
cd cbt-backend
php artisan serve
```
*(Backend akan aktif di `http://127.0.0.1:8000`)*

**Terminal 2 (Menjalankan Web Frontend):**
```bash
cd cbt-frontend
npm run dev
```
*(Frontend akan aktif di `http://localhost:5173`)*

Buka *browser* Anda dan kunjungi `http://localhost:5173` untuk mengakses aplikasi CBT!
