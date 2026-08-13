import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaClock,
  FaPlay,
  FaSpinner,
  FaExclamationTriangle,
  FaCheck,
  FaFlag,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaTrophy,
  FaExpand,
  FaTimes,
} from 'react-icons/fa';
import {
  blockExamRequest,
  fetchExamSession,
  saveAnswerRequest,
  submitExamRequest,
  type ExamQuestion,
} from './api/client';
import { useAuthStore } from './store/authStore';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ============================================================
   Offline resilience — jawaban disimpan ke localStorage agar
   tidak hilang saat koneksi terputus, lalu disinkronkan ke server.
   ============================================================ */

const STORAGE_KEY = (sessionId: number) => `cbt-exam-${sessionId}`;

interface LocalExamState {
  selected: Record<number, number | null>;
  essays: Record<number, string>;
  flagged: number[];
}

function loadLocalState(sessionId: number): LocalExamState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(sessionId));
    return raw ? (JSON.parse(raw) as LocalExamState) : null;
  } catch {
    return null;
  }
}

function persistLocalState(sessionId: number, state: LocalExamState): void {
  try {
    localStorage.setItem(STORAGE_KEY(sessionId), JSON.stringify(state));
  } catch {
    // storage penuh / private mode — abaikan, server tetap jadi backup
  }
}

function clearLocalState(sessionId: number): void {
  try {
    localStorage.removeItem(STORAGE_KEY(sessionId));
  } catch {
    // abaikan
  }
}

export default function ExamRoomPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams({ from: '/exam/$sessionId' });
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const sessionIdNum = Number(sessionId);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Record<number, number | null>>({});
  const [essays, setEssays] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [started, setStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [result, setResult] = useState<{ score: number | null; pg_correct: number; pg_total: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answerSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const blockedRef = useRef(false);
  // Ref cermin dari `selected`/`essays` — disinkronkan SINKRON di handler.
  // Dipakai oleh auto-save agar timer debounce tidak membaca state basi
  // (closure `setTimeout` selalu menangkap render sebelum perubahan).
  const selectedRef = useRef<Record<number, number | null>>({});
  const essaysRef = useRef<Record<number, string>>({});

  /* ===== Fetch session ===== */
  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['exam-session', sessionIdNum],
    queryFn: () => fetchExamSession(sessionIdNum),
    enabled: !isNaN(sessionIdNum),
    refetchOnWindowFocus: false,
  });

  // Init state dari jawaban tersimpan server + cadangan lokal (localStorage)
  useEffect(() => {
    if (!session) return;
    const questionIds = new Set(session.questions.map((q) => q.id));
    const opt: Record<number, number | null> = {};
    const ess: Record<number, string> = {};
    session.questions.forEach((q) => {
      opt[q.id] = q.saved_option_id;
      ess[q.id] = q.saved_essay_text ?? '';
    });

    // Prioritas: localStorage (tindakan paling baru) di atas nilai server
    const local = loadLocalState(sessionIdNum);
    if (local) {
      Object.entries(local.selected).forEach(([k, v]) => {
        const id = Number(k);
        if (questionIds.has(id)) opt[id] = v;
      });
      Object.entries(local.essays).forEach(([k, v]) => {
        const id = Number(k);
        if (questionIds.has(id)) ess[id] = v;
      });
      const flags = local.flagged.filter((id) => questionIds.has(id));
      setFlagged(new Set(flags));
    }

    selectedRef.current = opt;
    essaysRef.current = ess;
    setSelected(opt);
    setEssays(ess);
    setRemaining(session.remaining_seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Simpan ke localStorage setiap ada perubahan jawaban/ragu-ragu
  useEffect(() => {
    if (!started || blocked || result || !session) return;
    persistLocalState(sessionIdNum, {
      selected,
      essays,
      flagged: Array.from(flagged),
    });
  }, [selected, essays, flagged, started, blocked, result, session, sessionIdNum]);

  /* ===== Submit ===== */
  const submitMutation = useMutation({
    mutationFn: () => submitExamRequest(sessionIdNum),
    onSuccess: (data) => {
      setResult({ score: data.score, pg_correct: data.pg_correct, pg_total: data.pg_total });
      clearLocalState(sessionIdNum);
      queryClient.invalidateQueries({ queryKey: ['student-exams'] });
    },
  });

  const collectPendingAnswers = useCallback(() => {
    if (!session) return [];
    // Baca dari ref agar selalu mendapat nilai TERBARU, bukan closure basi.
    const sel = selectedRef.current;
    const ess = essaysRef.current;
    return session.questions
      .filter((qq) => {
        const opt = sel[qq.id];
        const text = ess[qq.id];
        return (qq.type === 'pg' && opt != null) || (qq.type === 'essay' && text && text.trim() !== '');
      })
      .map((qq) => ({
        question_id: qq.id,
        ...(qq.type === 'pg' ? { option_id: sel[qq.id] } : { essay_text: ess[qq.id] }),
      }));
  }, [session]);

  // Flush semua jawaban lokal dulu, baru submit — agar tidak ada jawaban yang tertinggal
  const handleSubmit = useCallback(async () => {
    if (submitMutation.isPending) return;
    if (answerSaveTimer.current) clearTimeout(answerSaveTimer.current);
    dirtyRef.current = false;

    const pending = collectPendingAnswers();
    if (pending.length > 0) {
      setSaveState('saving');
      try {
        await Promise.all(pending.map((p) => saveAnswerRequest(sessionIdNum, p)));
      } catch {
        // tetap lanjut submit; jawaban yang sudah tersimpan sebelumnya tetap dihitung
      }
    }
    try {
      await submitMutation.mutateAsync();
      setSubmitError(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setSubmitError(message || 'Gagal mengumpulkan ujian. Periksa koneksi Anda dan coba lagi.');
      // Jawaban tetap aman di localStorage — coba sinkronkan lagi saat koneksi pulih
      dirtyRef.current = true;
    }
  }, [submitMutation, collectPendingAnswers, sessionIdNum]);

  /* ===== Timer ===== */
  useEffect(() => {
    if (!started || blocked || result || remaining <= 0) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setAutoSubmitted(true);
          void handleSubmit();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, blocked, result, handleSubmit]);

  const blockMutation = useMutation({
    mutationFn: () => blockExamRequest(sessionIdNum),
  });

  const doBlock = useCallback(() => {
    if (blockedRef.current) return;
    blockedRef.current = true;
    setBlocked(true);
    clearLocalState(sessionIdNum);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    blockMutation.mutate();
  }, [blockMutation, sessionIdNum]);

  /* ===== Anti-cheat: visibility + fullscreen ===== */
  useEffect(() => {
    if (!started || result) return;

    const onVisibility = () => {
      if (document.hidden) doBlock();
    };
    const onFullscreenChange = () => {
      const isFs = document.fullscreenElement !== null;
      setIsFullscreen(isFs);
      if (started && !isFs && !blockedRef.current && !autoSubmitted) doBlock();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const isBadKey =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'p' || e.key === 'u' || e.key === 's'));
      if (isBadKey) e.preventDefault();
    };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [started, result, doBlock, autoSubmitted]);

  /* ===== Auto-save (debounced) ===== */
  const flushAnswers = useCallback(() => {
    dirtyRef.current = false;
    const pending = collectPendingAnswers();
    if (pending.length === 0) {
      setSaveState('idle');
      return;
    }
    setSaveState('saving');
    Promise.all(pending.map((p) => saveAnswerRequest(sessionIdNum, p)))
      .then(() => setSaveState('saved'))
      .catch(() => {
        // Gagal (offline) — jawaban tetap aman di localStorage,
        // akan disinkronkan otomatis saat koneksi kembali.
        dirtyRef.current = true;
        setSaveState('idle');
      });
  }, [collectPendingAnswers, sessionIdNum]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (answerSaveTimer.current) clearTimeout(answerSaveTimer.current);
    answerSaveTimer.current = setTimeout(flushAnswers, 900);
  }, [flushAnswers]);

  // Sinkronisasi otomatis saat koneksi internet kembali (offline → online)
  useEffect(() => {
    if (!started || blocked || result) return;
    const onOnline = () => {
      if (dirtyRef.current) flushAnswers();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [started, blocked, result, flushAnswers]);

  // Flush saat komponen unmount / pindah halaman
  const collectPendingRef = useRef(collectPendingAnswers);
  collectPendingRef.current = collectPendingAnswers;
  useEffect(() => {
    return () => {
      if (answerSaveTimer.current) clearTimeout(answerSaveTimer.current);
      if (dirtyRef.current && !blockedRef.current) {
        const pending = collectPendingRef.current();
        if (pending.length > 0) {
          void Promise.all(pending.map((p) => saveAnswerRequest(sessionIdNum, p)));
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdNum]);

  const handleSelectOption = (questionId: number, optionId: number) => {
    if (blocked || blockedRef.current || result) return;
    selectedRef.current = { ...selectedRef.current, [questionId]: optionId };
    setSelected(selectedRef.current);
    scheduleSave();
  };

  const handleEssayChange = (questionId: number, value: string) => {
    if (blocked || blockedRef.current || result) return;
    essaysRef.current = { ...essaysRef.current, [questionId]: value };
    setEssays(essaysRef.current);
    scheduleSave();
  };

  const toggleFlag = (questionId: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleStart = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {
          // Browser menolak fullscreen — tetap mulai, header menampilkan peringatan
          setIsFullscreen(false);
        });
    } else {
      setIsFullscreen(false);
    }
    setStarted(true);
  };

  const handleLogout = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    clearAuth();
    navigate({ to: '/' });
  };

  const answeredCount = useMemo(() => {
    if (!session) return 0;
    return session.questions.filter((q) =>
      q.type === 'pg' ? selected[q.id] != null : (essays[q.id] ?? '').trim() !== '',
    ).length;
  }, [session, selected, essays]);

  // currentQuestion hanya dipakai setelah guard loading/error di bawah,
  // jadi fallback ke soal pertama untuk memuaskan type-checking.
  const currentQuestion: ExamQuestion = (session?.questions[currentIndex] ?? session?.questions[0])!;

  /* ===== Loading / Error ===== */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafbff]">
        <div className="text-center">
          <FaSpinner className="mx-auto animate-spin text-3xl text-indigo-600" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Memuat ujian…</p>
        </div>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafbff] px-6">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <FaExclamationTriangle className="text-xl" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Tidak dapat memuat ujian</h1>
          <p className="mt-2 text-sm text-slate-500">
            {error instanceof Error ? error.message : 'Sesi tidak ditemukan atau sudah berakhir.'}
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ===== Blocked screen ===== */
  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-rose-500/10 p-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
            <FaExclamationTriangle className="text-3xl" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white">UJIAN TERHENTI</h1>
          <p className="mt-3 text-sm leading-relaxed text-rose-200/90">
            Terdeteksi keluar dari mode fullscreen atau berpindah tab. Sesi ujian Anda dibekukan otomatis.
            Silakan hubungi pengawas untuk membuka kembali.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 font-mono text-xs font-bold text-rose-300">
            <FaClock aria-hidden="true" />
            MENUNGGU RESET PENGAWAS
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/10"
          >
            Keluar dari Ujian
          </button>
        </div>
      </div>
    );
  }

  /* ===== Result screen ===== */
  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafbff] px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
            <FaTrophy className="text-2xl" aria-hidden="true" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-emerald-600">
            Ujian Selesai
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {session.title}
          </h1>

          <div className="mt-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 p-6 ring-1 ring-indigo-100">
            <p className="text-sm font-semibold text-slate-500">Nilai Pilihan Ganda</p>
            <p className="mt-1 font-mono text-5xl font-bold tabular-nums tracking-tight text-indigo-600">
              {result.score != null ? result.score : '—'}
              {result.score != null && <span className="text-2xl text-indigo-400">/100</span>}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-500">
              {result.pg_correct} benar dari {result.pg_total} soal
            </p>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-slate-500">
            Jawaban essay akan dinilai oleh guru. Hasil akhir dapat dilihat melalui pengawas.
          </p>

          <button
            type="button"
            onClick={() => navigate({ to: '/dashboard' })}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-base font-bold text-white shadow-lg shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-600"
          >
            <FaCheckCircle aria-hidden="true" />
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ===== Start overlay (fullscreen lock) ===== */
  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafbff] px-6">
        <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />

          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/30">
            <FaShieldAlt className="text-2xl" aria-hidden="true" />
          </span>
          <h1 className="relative mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
            {session.title}
          </h1>
          <p className="relative mt-2 text-sm font-medium text-slate-500">
            {session.questions.length} soal · {session.duration_minutes} menit
          </p>

          <div className="relative mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-left ring-1 ring-slate-100">
            <p className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
              <FaExpand className="text-indigo-500" aria-hidden="true" />
              Mode Fullscreen Wajib
            </p>
            <p className="flex items-start gap-2.5 text-sm text-slate-600">
              <FaTimes className="mt-0.5 text-rose-400" aria-hidden="true" />
              Keluar dari layar penuh, berpindah tab, atau menekan Esc akan <strong>membekukan ujian</strong>.
            </p>
            <p className="flex items-start gap-2.5 text-sm text-slate-600">
              <FaFlag className="mt-0.5 text-amber-500" aria-hidden="true" />
              Gunakan tombol ragu-ragu pada soal yang belum yakin.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="relative mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <FaPlay aria-hidden="true" />
            Masuk & Mulai Ujian
          </button>
        </div>
      </div>
    );
  }

  /* ===== Exam room ===== */
  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
                <FaShieldAlt className="text-sm" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">
                  {session.title}
                </p>
                <p
                  className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                    isFullscreen ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping-slow rounded-full ${
                        isFullscreen ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                        isFullscreen ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                  </span>
                  {isFullscreen ? 'Mode Pengawasan Aktif' : 'Kembalikan layar penuh!'}
                </p>
              </div>
            </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-sm font-bold tabular-nums ring-1 sm:text-base ${
                remaining <= 300
                  ? 'animate-pulse bg-rose-50 text-rose-600 ring-rose-200'
                  : 'bg-amber-50 text-amber-600 ring-amber-200'
              }`}
              role="timer"
              aria-label="Sisa waktu"
            >
              <FaClock aria-hidden="true" />
              {formatTime(remaining)}
            </span>
            <span className="hidden items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
              {saveState === 'saving' && (
                <>
                  <FaSpinner className="animate-spin text-indigo-500" aria-hidden="true" /> Menyimpan…
                </>
              )}
              {saveState === 'saved' && (
                <>
                  <FaCloudUploadAlt className="text-emerald-500" aria-hidden="true" /> Tersimpan
                </>
              )}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              aria-label="Keluar dari ujian"
            >
              <FaSignOutAlt className="text-xs" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {submitError && (
        <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700"
          >
            <FaExclamationTriangle className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_280px]">
        {/* Question panel */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Soal {currentIndex + 1} dari {session.questions.length}
            </p>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {currentQuestion?.type === 'essay' ? 'Essay' : 'Pilihan Ganda'}
            </span>
          </div>

          <h2 className="mt-4 text-lg font-bold leading-relaxed text-slate-900 sm:text-xl">
            {currentQuestion?.question_text}
          </h2>

          {currentQuestion?.media_url && (
            <img
              src={currentQuestion.media_url}
              alt="Ilustrasi soal"
              className="mt-4 max-h-64 rounded-2xl border border-slate-200 object-contain"
            />
          )}

          {currentQuestion?.type === 'pg' ? (
            <div className="mt-6 space-y-3">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selected[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className={`flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm font-bold ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      {OPTION_LABELS[i] ?? String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt.option_text}</span>
                    {isSelected && <FaCheck className="text-emerald-500" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6">
              <textarea
                value={essays[currentQuestion.id] ?? ''}
                onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                rows={6}
                placeholder="Tulis jawaban Anda di sini…"
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
              <p className="mt-2 text-xs font-medium text-slate-400">
                {essays[currentQuestion.id]?.length ?? 0} karakter
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Sebelumnya
            </button>

            <button
              type="button"
              onClick={() => toggleFlag(currentQuestion.id)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-all duration-200 ${
                flagged.has(currentQuestion.id)
                  ? 'border-amber-300 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              <FaFlag aria-hidden="true" />
              {flagged.has(currentQuestion.id) ? 'Ragu-ragu ✓' : 'Ragu-ragu'}
            </button>

            {currentIndex < session.questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(session.questions.length - 1, i + 1))}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-600"
              >
                Selanjutnya →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitMutation.isPending ? (
                  <>
                    <FaSpinner className="animate-spin" aria-hidden="true" /> Mengumpulkan…
                  </>
                ) : (
                  <>Kumpulkan Ujian</>
                )}
              </button>
            )}
          </div>
        </section>

        {/* Navigator sidebar */}
        <aside className="h-fit rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Navigasi Soal
            </h3>
            <span className="font-mono text-xs font-bold text-indigo-600">
              {answeredCount}/{session.questions.length}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
            {session.questions.map((q, i) => {
              const isAnswered = q.type === 'pg' ? selected[q.id] != null : (essays[q.id] ?? '').trim() !== '';
              const isFlag = flagged.has(q.id);
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`flex h-9 items-center justify-center rounded-lg font-mono text-xs font-bold transition-all duration-150 hover:scale-110 ${
                    isCurrent
                      ? 'ring-2 ring-indigo-400 ring-offset-1'
                      : ''
                  } ${
                    isFlag
                      ? 'bg-amber-400 text-amber-950'
                      : isAnswered
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  aria-label={`Soal ${i + 1}${isAnswered ? ' dijawab' : ''}${isFlag ? ' ragu-ragu' : ''}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" /> Dijawab
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-400" /> Ragu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-200" /> Kosong
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={submitMutation.isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitMutation.isPending ? (
              <FaSpinner className="animate-spin" aria-hidden="true" />
            ) : (
              <FaCheckCircle aria-hidden="true" />
            )}
            Kumpulkan Ujian
          </button>
        </aside>
      </main>
    </div>
  );
}
