# Skill / Panduan Frontend: React, Zustand, TanStack untuk CBT

Dokumen ini adalah panduan teknis (skill) untuk mengimplementasikan Frontend aplikasi CBT.

## 1. Persiapan & Instalasi
- **Inisialisasi Project:** 
  ```bash
  npm create vite@latest cbt-client -- --template react-ts
  ```
- **Dependencies Utama:**
  ```bash
  npm install zustand @tanstack/react-query @tanstack/react-router axios tailwindcss postcss autoprefixer react-icons
  ```
- **Setup Tailwind:** Jalankan `npx tailwindcss init -p` dan konfigurasi `tailwind.config.js`.

## 2. Struktur Folder & Arsitektur
- `/src/api` : Konfigurasi Axios instance dan interceptors (menyematkan token dari localStorage/Zustand).
- `/src/store` : Zustand store (AuthStore, ExamStore).
- `/src/hooks` : Custom hooks (React Query untuk fetching, custom hook untuk Fullscreen & Visibility).
- `/src/pages` : Halaman-halaman (Login, AdminDashboard, ExamList, ExamRoom).
- `/src/components` : Komponen reusable (Button, Input, QuestionCard, Timer).

## 3. State Management (Zustand)
Gunakan Zustand khusus untuk state yang berjalan sinkron dan butuh performa tinggi saat ujian:
- **ExamStore (`useExamStore`):**
  - Menyimpan sisa waktu (countdown timer).
  - Menyimpan jawaban sementara siswa (berguna jika offline, tersimpan di localStorage persist).
  - Menyimpan status ujian: `isPlaying`, `isBlocked`, `isFinished`.

## 4. Data Fetching (TanStack Query)
Gunakan React Query untuk mengambil data dari backend Laravel:
- Fetching daftar ujian: `useQuery({ queryKey: ['exams'], queryFn: fetchExams })`.
- Menyimpan jawaban (auto-save): Gunakan `useMutation` dengan debouncing atau interval setiap soal dijawab, agar tidak spam ke server.

## 5. Implementasi Anti-Cheat (Core Feature)
Di halaman `ExamRoom`, implementasikan sistem anti-kecurangan secara ketat.

### A. Fullscreen API
Sebelum merender soal, minta siswa klik tombol "Mulai Ujian". Event onClick akan memicu:
```javascript
const requestFullscreen = () => {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  }
};
```
Gunakan listener `fullscreenchange`. Jika `document.fullscreenElement` bernilai null, berarti siswa menekan ESC. Panggil API ke backend untuk mem-block sesi, dan set status Zustand ke `isBlocked`. Layar harus ditimpa dengan modal merah besar "UJIAN TERHENTI - HUBUNGI PENGAWAS".

### B. Page Visibility API
Deteksi perpindahan tab:
```javascript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Siswa pindah tab!
      blockExamMutation.mutate(); // Tembak API block
      setBlocked(true); // Kunci UI
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);
```

### C. Disable Keyboard Shortcuts & Context Menu
```javascript
useEffect(() => {
  const preventContext = (e) => e.preventDefault();
  const preventKeys = (e) => {
    // Prevent F12, Ctrl+Shift+I, Ctrl+C, Ctrl+V, dll
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.ctrlKey && e.keyCode === 67)) {
      e.preventDefault();
    }
  };
  window.addEventListener('contextmenu', preventContext);
  window.addEventListener('keydown', preventKeys);
  return () => {
    window.removeEventListener('contextmenu', preventContext);
    window.removeEventListener('keydown', preventKeys);
  }
}, []);
```

## 6. Desain UI/UX
- Gunakan warna yang menenangkan (putih, abu-abu muda, biru aksen).
- Navigasi nomor soal di sidebar samping (warna hijau untuk dijawab, kuning untuk ragu-ragu, putih/abu untuk belum dijawab).
- Header selalu *sticky* menampilkan Sisa Waktu yang mencolok.
