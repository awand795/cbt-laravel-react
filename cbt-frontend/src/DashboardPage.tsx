import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaArrowLeft,
  FaClock,
  FaListOl,
  FaBookOpen,
  FaPlay,
  FaSpinner,
  FaCheckCircle,
  FaLock,
  FaExclamationTriangle,
  FaUserGraduate,
  FaCalendarAlt,
} from 'react-icons/fa';
import { fetchStudentExams, logoutRequest, startExamRequest } from './api/client';
import { useAuthStore } from './store/authStore';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Guru',
  student: 'Siswa',
};

const STATUS_CONFIG = {
  ongoing: { label: 'Sedang Berlangsung', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  finished: { label: 'Selesai', color: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  blocked: { label: 'Terblokir', color: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  fallback: { label: 'Status Tidak Dikenal', color: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
} as const;

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: exams, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-exams'],
    queryFn: fetchStudentExams,
  });

  const startMutation = useMutation({
    mutationFn: startExamRequest,
    onSuccess: (data) => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['student-exams'] });
      navigate({ to: '/exam/$sessionId', params: { sessionId: String(data.session_id) } });
    },
    onError: (err: unknown) => {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setActionError(message || 'Gagal memulai ujian. Coba lagi.');
    },
  });

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // abaikan — token tetap dibersihkan lokal
    } finally {
      clearAuth();
      navigate({ to: '/' });
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 19) return 'Selamat sore';
    return 'Selamat malam';
  })();

  return (
    <div className="min-h-screen bg-[#fafbff] font-sans text-slate-900 antialiased">
      {/* ===== Top bar ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30">
              <FaShieldAlt className="text-sm" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              CBT<span className="text-indigo-600"> Sekolah</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 sm:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-indigo-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              {user?.name ?? 'Siswa'}
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                {user ? ROLE_LABEL[user.role] : 'Siswa'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <FaSignOutAlt className="text-xs" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        {/* ===== Greeting ===== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
            >
              <FaArrowLeft className="text-xs" aria-hidden="true" /> Beranda
            </Link>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {greeting},{' '}
              <span className="text-gradient">{user?.name?.split(' ')[0] ?? 'Siswa'}!</span>
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <FaUserGraduate className="text-indigo-400" aria-hidden="true" />
              Berikut daftar ujian yang tersedia untuk Anda saat ini.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm">
            <FaCalendarAlt className="text-indigo-500" aria-hidden="true" />
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* ===== Error banner (action) ===== */}
        {actionError && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700"
          >
            <FaExclamationTriangle className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        {/* ===== Fetch error ===== */}
        {isError && (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-8 py-14 text-center shadow-sm">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <FaExclamationTriangle className="text-xl" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Gagal memuat daftar ujian</h2>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              {error instanceof Error ? error.message : 'Terjadi kesalahan tidak diketahui.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* ===== Exam list ===== */}
        {isLoading ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white p-7">
                <div className="h-4 w-24 rounded-full bg-slate-100" />
                <div className="mt-4 h-6 w-3/4 rounded-lg bg-slate-100" />
                <div className="mt-3 h-4 w-1/2 rounded-lg bg-slate-100" />
                <div className="mt-8 h-11 w-full rounded-2xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : exams && exams.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <FaBookOpen className="text-xl" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Belum ada ujian tersedia</h2>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              Saat ini belum ada ujian yang dijadwalkan untuk Anda. Cek kembali nanti ya!
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {exams?.map((exam) => {
              const session = exam.session;
              const status = session
                ? (STATUS_CONFIG[session.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.fallback)
                : null;

              return (
                <article
                  key={exam.id}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10"
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-100/70 to-violet-100/70 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                      <FaBookOpen className="text-[11px]" aria-hidden="true" />
                      {exam.subject ?? 'Umum'}
                    </span>
                    {status ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${status.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600 ring-1 ring-sky-100">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-sky-400" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
                        </span>
                        Tersedia
                      </span>
                    )}
                  </div>

                  <h2 className="relative mt-4 text-xl font-bold tracking-tight text-slate-900">
                    {exam.title}
                  </h2>

                  <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <FaClock className="text-amber-500" aria-hidden="true" />
                      {exam.duration_minutes} menit
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FaListOl className="text-indigo-500" aria-hidden="true" />
                      {exam.questions_count} soal
                    </span>
                  </div>

                  {session && (
                    <p className="relative mt-3 rounded-xl bg-slate-50 px-4 py-2.5 font-mono text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
                      Mulai: {formatDateTime(session.started_at)}
                      {session.cheat_count > 0 && (
                        <span className="ml-2 font-bold text-rose-500">
                          · {session.cheat_count} pelanggaran
                        </span>
                      )}
                    </p>
                  )}

                  <div className="relative mt-6 flex-1" />

                  {!session ? (
                    <button
                      type="button"
                      disabled={startMutation.isPending}
                      onClick={() => startMutation.mutate(exam.id)}
                      className="group/btn relative inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {startMutation.isPending && startMutation.variables === exam.id ? (
                        <>
                          <FaSpinner className="animate-spin text-sm" aria-hidden="true" />
                          Menyiapkan…
                        </>
                      ) : (
                        <>
                          <FaPlay className="text-xs" aria-hidden="true" />
                          Mulai Ujian
                        </>
                      )}
                    </button>
                  ) : session.status === 'ongoing' ? (
                    <button
                      type="button"
                      disabled={startMutation.isPending}
                      onClick={() => startMutation.mutate(exam.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {startMutation.isPending && startMutation.variables === exam.id ? (
                        <>
                          <FaSpinner className="animate-spin text-xs" aria-hidden="true" />
                          Melanjutkan…
                        </>
                      ) : (
                        <>
                          <FaPlay className="text-xs" aria-hidden="true" />
                          Lanjutkan Ujian
                        </>
                      )}
                    </button>
                  ) : session.status === 'finished' ? (
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3.5 text-sm font-bold text-slate-500">
                      <FaCheckCircle aria-hidden="true" />
                      Ujian Selesai
                    </div>
                  ) : (
                    <div className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-5 py-3.5 text-sm font-bold text-rose-600 ring-1 ring-rose-200">
                      <FaLock aria-hidden="true" />
                      Hubungi Pengawas
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* ===== Info card ===== */}
        <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-md shadow-indigo-600/10">
              <FaShieldAlt aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">Mode Pengawasan Aktif</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Saat ujian dimulai, Anda harus berada dalam mode fullscreen. Keluar dari layar penuh atau berpindah tab akan membekukan ujian.
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:text-indigo-600"
          >
            Pelajari Aturan
          </Link>
        </div>
      </main>
    </div>
  );
}
