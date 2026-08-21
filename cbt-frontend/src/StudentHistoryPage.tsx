import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaArrowLeft,
  FaTrophy,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaBookOpen,
  FaFlag,
} from 'react-icons/fa';
import { fetchExamHistory, logoutRequest, type ExamHistoryData } from './api/client';
import { useAuthStore } from './store/authStore';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StudentHistoryPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['exam-history'],
    queryFn: fetchExamHistory,
  });

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore
    } finally {
      clearAuth();
      navigate({ to: '/' });
    }
  };

  const summary = data?.summary;
  const history = data?.history ?? [];

  return (
    <div className="min-h-screen bg-[#fafbff] font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30">
              <FaShieldAlt className="text-sm" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              CBT<span className="text-indigo-600"> Sekolah</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <FaSignOutAlt className="text-xs" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
        >
          <FaArrowLeft className="text-xs" /> Kembali ke Dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Riwayat Ujian</h1>

        {isError && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>{error instanceof Error ? error.message : 'Gagal memuat riwayat ujian.'}</span>
          </div>
        )}

        {isLoading ? (
          <div className="mt-14 flex flex-col items-center gap-3">
            <FaSpinner className="animate-spin text-3xl text-indigo-500" />
            <p className="text-sm font-medium text-slate-500">Memuat riwayat ujian…</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Ujian Diselesaikan', value: summary.total_exams, icon: FaBookOpen, grad: 'from-indigo-500 to-violet-600' },
                  { label: 'Rata-rata Nilai', value: summary.average_score != null ? `${summary.average_score}` : '—', icon: FaTrophy, grad: 'from-emerald-500 to-teal-600' },
                  { label: 'Nilai Tertinggi', value: summary.best_score != null ? `${summary.best_score}` : '—', icon: FaCheckCircle, grad: 'from-sky-500 to-cyan-600' },
                  { label: 'Total Pelanggaran', value: summary.total_cheats, icon: FaFlag, grad: 'from-amber-500 to-orange-600' },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.grad} text-sm text-white shadow-lg`}>
                      <c.icon aria-hidden="true" />
                    </span>
                    <p className="relative mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                      {c.value}
                    </p>
                    <p className="relative mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{c.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* History List */}
            <div className="mt-8">
              {history.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center shadow-sm">
                  <FaBookOpen className="mx-auto text-4xl text-slate-300" />
                  <p className="mt-4 text-lg font-bold text-slate-400">Belum ada riwayat ujian</p>
                  <p className="mt-1 text-sm text-slate-400">Ujian yang sudah selesai akan muncul di sini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.session_id}
                      className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-extrabold text-slate-900">{item.exam_title}</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">{item.subject ?? '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-1">
                            <FaClock className="text-indigo-400" /> {item.duration_minutes} menit
                          </span>
                          <span>{formatDate(item.finished_at)}</span>
                          {item.duration_taken != null && (
                            <span>Dikerjakan {item.duration_taken} menit</span>
                          )}
                          {item.cheat_count > 0 && (
                            <span className="flex items-center gap-1 text-rose-500">
                              <FaFlag className="text-[10px]" /> {item.cheat_count} pelanggaran
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-400">Nilai PG</p>
                          <p className={`font-mono text-2xl font-bold tabular-nums ${item.score != null ? (item.score >= 70 ? 'text-emerald-600' : item.score >= 50 ? 'text-amber-600' : 'text-rose-600') : 'text-slate-400'}`}>
                            {item.score != null ? item.score : '—'}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400">
                            {item.pg_correct}/{item.pg_total} benar
                          </p>
                        </div>

                        {item.essay_answered > 0 && (
                          <div className="text-center">
                            <p className="text-xs font-semibold text-slate-400">Essay</p>
                            <p className="font-mono text-sm font-bold text-slate-600">
                              {item.essay_graded}/{item.essay_answered}
                            </p>
                            <p className="text-[11px] font-medium text-slate-400">dinilai</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
