import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useRevealObserver } from './hooks/useReveal';
import { logoutRequest } from './api/client';
import { useAuthStore } from './store/authStore';
import { homePathForRole } from './router/guards';
import {
  FaShieldAlt,
  FaRocket,
  FaChartLine,
  FaArrowRight,
  FaSignInAlt,
  FaCheckCircle,
  FaRandom,
  FaCloudUploadAlt,
  FaEye,
  FaUserShield,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaUserTie,
  FaClock,
  FaBars,
  FaTimes,
  FaChevronRight,
  FaPlay,
  FaLock,
  FaCheck,
  FaExclamationTriangle,
  FaWifi,
  FaSyncAlt,
  FaDatabase,
  FaInfinity,
} from 'react-icons/fa';

/* ============================================================
   Small helpers: animated counter
   ============================================================ */

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
          setValue(target);
          return;
        }
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, value };
}

/* ============================================================
   Navbar
   ============================================================ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // abaikan error jaringan — token tetap dibersihkan di sisi klien
    } finally {
      clearAuth();
      navigate({ to: '/' });
    }
  };

  const links = [
    { href: '#fitur', label: 'Fitur' },
    { href: '#cara-kerja', label: 'Cara Kerja' },
    { href: '#keamanan', label: 'Keamanan' },
    { href: '#peran', label: 'Peran' },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6">
      <nav
        className={`mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 sm:px-6 ${
          scrolled || open
            ? 'glass shadow-[0_8px_40px_-12px_rgba(15,23,42,0.18)]'
            : 'bg-transparent border border-transparent'
        }`}
        aria-label="Navigasi utama"
      >
        {/* Logo */}
        <a href="#" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <FaShieldAlt className="text-sm" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            CBT<span className="text-indigo-600"> Sekolah</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-slate-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                to={homePathForRole(user.role)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {user.name}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Keluar
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-indigo-600/30"
            >
              <FaSignInAlt className="text-xs" aria-hidden="true" />
              Masuk Portal
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-900/5 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
        >
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl glass shadow-xl md:hidden">
          <div className="flex flex-col gap-1 p-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-900/5"
              >
                {l.label}
              </a>
            ))}
          {user ? (
            <>
              <Link
                to={homePathForRole(user.role)}
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
              >
                Dashboard ({user.name})
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void handleLogout();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-rose-600"
              >
                Keluar
              </button>
            </>
          ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
              >
                <FaSignInAlt className="text-xs" aria-hidden="true" /> Masuk Portal
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ============================================================
   Exam UI mockup (hero signature element)
   ============================================================ */

function ExamMockup() {
  const options = [
    { key: 'A', text: '2x + 3 = 11, maka x = …' },
    { key: 'B', text: 'x = 4 (jawabanmu)' },
    { key: 'C', text: 'x = 3' },
    { key: 'D', text: 'x = 5' },
  ];
  const navigator = Array.from({ length: 40 }, (_, i) => i + 1);
  const answered = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  const flagged = new Set([11, 17, 25]);

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Browser window */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_40px_80px_-24px_rgba(15,23,42,0.35)]">
        {/* Chrome bar */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="mx-auto flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200/70">
            <FaLock className="text-[9px] text-emerald-500" aria-hidden="true" />
            cbt.sekolah.id/ujian
          </div>
          <span className="w-6" />
        </div>

        {/* Exam header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Matematika · Ujian Tengah Semester
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">Kelas IX-A · 40 Soal</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              LIVE
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-amber-600 ring-1 ring-amber-200">
              <FaClock className="text-[10px]" aria-hidden="true" />
              24:18
            </span>
          </div>
        </div>

        {/* Question card */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-semibold text-indigo-500">Soal 7 dari 40</p>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed text-slate-800">
            Tentukan nilai x yang memenuhi persamaan berikut.
          </p>

          <div className="mt-3 space-y-2">
            {options.map((o) => {
              const selected = o.key === 'B';
              return (
                <div
                  key={o.key}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50/80 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold ${
                      selected
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    {o.key}
                  </span>
                  <span className="font-medium">{o.text}</span>
                  {selected && (
                    <FaCheckCircle className="ml-auto text-emerald-500" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Question navigator — the LJK bubble grid */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigasi Soal
            </p>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dijawab
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Ragu
              </span>
            </div>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {navigator.map((n) => {
              const isAnswered = answered.has(n);
              const isFlag = flagged.has(n);
              return (
                <span
                  key={n}
                  className={`flex h-6 items-center justify-center rounded-md font-mono text-[10px] font-bold transition-transform hover:scale-110 ${
                    isFlag
                      ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500'
                      : isAnswered
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-400 ring-1 ring-slate-200'
                  }`}
                >
                  {n}
                </span>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
              <FaUserShield className="text-[10px]" aria-hidden="true" />
              Mode Pengawasan Aktif
            </span>
            <span className="pointer-events-none rounded-lg bg-indigo-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-indigo-600/30">
              Kumpulkan
            </span>
          </div>
        </div>
      </div>

      {/* Floating chip — autosave */}
      <div className="absolute -left-4 top-1/3 hidden animate-float items-center gap-2 rounded-2xl glass px-4 py-2.5 shadow-xl shadow-slate-900/10 sm:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <FaCloudUploadAlt aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-800">Tersimpan Lokal</p>
          <p className="text-[10px] font-medium text-slate-500">Auto-save aktif · 29 jawaban</p>
        </div>
      </div>

      {/* Floating chip — anti cheat */}
      <div className="absolute -right-3 -top-5 hidden animate-float-slow items-center gap-2 rounded-2xl glass px-4 py-2.5 shadow-xl shadow-slate-900/10 sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-indigo-400" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
        </span>
        <div>
          <p className="text-xs font-bold text-slate-800">Anti-Cheat Engine</p>
          <p className="text-[10px] font-medium text-slate-500">Fullscreen lock · 0 pelanggaran</p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Hero
   ============================================================ */

function Hero() {
  const user = useAuthStore((s) => s.user);

  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 animate-blob rounded-full bg-gradient-to-r from-indigo-300/40 via-violet-300/35 to-sky-300/40 blur-[100px]" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 animate-blob-slow rounded-full bg-violet-200/40 blur-[90px]" />
        <div className="absolute -right-32 top-1/4 h-80 w-80 rounded-full bg-sky-200/40 blur-[90px]" />
        <div className="absolute inset-0 bg-dots opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2 lg:gap-10">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <div className="reveal inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-4 py-1.5 text-xs font-bold text-indigo-600 shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Platform Ujian Digital untuk Sekolah Indonesia
          </div>

          <h1 className="reveal mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
            Ujian Sekolah{' '}
            <span className="text-gradient">Tanpa Kecurangan</span>, Tanpa Ribet.
          </h1>

          <p className="reveal mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0" style={{ '--reveal-delay': '160ms' } as CSSProperties}>
            Sistem Computer Based Test modern dengan <strong className="font-semibold text-slate-800">Anti-Cheat</strong> tingkat tinggi — mode fullscreen wajib, deteksi perpindahan tab, dan auto-save offline agar ujian tetap aman dan lancar.
          </p>

          <div className="reveal mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start" style={{ '--reveal-delay': '240ms' } as CSSProperties}>
            {user ? (
              <Link
                to={homePathForRole(user.role)}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-600/40 sm:w-auto"
              >
                Buka Dashboard
                <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-600/40 sm:w-auto"
              >
                Mulai Ujian Sekarang
                <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            )}
            <a
              href="#fitur"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-bold text-slate-700 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 sm:w-auto"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition-transform duration-300 group-hover:scale-110">
                <FaPlay className="ml-0.5 text-[9px]" aria-hidden="true" />
              </span>
              Lihat Fitur
            </a>
          </div>

          {/* Trust row */}
          <div className="reveal mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start" style={{ '--reveal-delay': '320ms' } as CSSProperties}>
            <div className="flex -space-x-2.5">
              {[
                { c: 'bg-indigo-500', t: 'SD' },
                { c: 'bg-violet-500', t: 'SM' },
                { c: 'bg-sky-500', t: 'SM' },
                { c: 'bg-emerald-500', t: 'MA' },
              ].map((a) => (
                <span
                  key={a.c}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${a.c}`}
                >
                  {a.t}
                </span>
              ))}
            </div>
            <div className="text-center sm:text-left">
              <p className="text-sm font-bold text-slate-800">Dipercaya 500+ sekolah</p>
              <p className="text-xs font-medium text-slate-500">SD, SMP, SMA, SMK & Madrasah</p>
            </div>
          </div>
        </div>

        {/* Mockup */}
        <div className="reveal" style={{ '--reveal-delay': '200ms' } as CSSProperties}>
          <ExamMockup />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Marquee strip
   ============================================================ */

const JENJANG = ['SD', 'SMP', 'SMA', 'SMK', 'Madrasah', 'Pesantren', 'Kurikulum Merdeka', 'Ujian Akhir Semester', 'Try Out & Simulasi', 'Penilaian Harian', 'Ujian Sekolah'];

function Marquee() {
  const items = [...JENJANG, ...JENJANG];
  return (
    <section className="relative border-y border-slate-200/70 bg-white py-5">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 lg:flex-row lg:gap-10">
        <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400">
          Siap untuk berbagai kebutuhan
        </p>
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee items-center">
            {items.map((item, i) => (
              <span key={i} className="flex items-center whitespace-nowrap pr-8 text-sm font-bold text-slate-500">
                {item}
                <FaChevronRight className="ml-8 text-[9px] text-indigo-300" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Stats band
   ============================================================ */

const STATS = [
  { icon: FaGraduationCap, value: 250, suffix: 'rb+', label: 'Siswa terlayani' },
  { icon: FaUserTie, value: 500, suffix: '+', label: 'Sekolah mitra' },
  { icon: FaDatabase, value: 1, suffix: ' jt+', label: 'Soal di bank soal' },
  { icon: FaInfinity, value: 99, suffix: '.9%', label: 'Kestabilan ujian', decimal: true },
];

function StatItem({ stat, delay }: { stat: (typeof STATS)[number]; delay: number }) {
  const { ref, value } = useCountUp(stat.value, 1800 + delay);
  return (
    <div className="reveal text-center" style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-600 ring-1 ring-indigo-100">
        <stat.icon aria-hidden="true" />
      </span>
      <p className="font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
        <span ref={ref}>{value}</span>
        {stat.suffix}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-slate-500">{stat.label}</p>
    </div>
  );
}

function StatsBand() {
  return (
    <section className="relative bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <StatItem key={s.label} stat={s} delay={i * 200} />
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   Features — bento grid
   ============================================================ */

const FEATURES = [
  {
    icon: FaUserShield,
    color: 'from-indigo-500 to-violet-600',
    title: 'Anti-Cheat Engine',
    desc: 'Mode fullscreen wajib, deteksi perpindahan tab, dan kunci otomatis saat pelanggaran — dengan reset cepat oleh pengawas.',
    tag: 'Keamanan',
  },
  {
    icon: FaCloudUploadAlt,
    color: 'from-emerald-500 to-teal-600',
    title: 'Auto-Save Offline',
    desc: 'Jawaban tersimpan otomatis ke memori browser. Koneksi putus? Tetap lanjut, tersinkron saat online kembali.',
    tag: 'Ketahanan',
  },
  {
    icon: FaRandom,
    color: 'from-amber-500 to-orange-600',
    title: 'Randomisasi Soal & Opsi',
    desc: 'Urutan soal dan opsi A–D diacak untuk tiap peserta — meminimalkan peluang menyontek antar teman.',
    tag: 'Integritas',
  },
  {
    icon: FaEye,
    color: 'from-sky-500 to-cyan-600',
    title: 'Live Monitoring',
    desc: 'Pantau status peserta secara real-time: sedang ujian, selesai, atau terblokir — tanpa refresh halaman.',
    tag: 'Pengawasan',
  },
  {
    icon: FaChartLine,
    color: 'from-rose-500 to-pink-600',
    title: 'Auto-Grading + Essay',
    desc: 'Nilai pilihan ganda terhitung otomatis, soal essay dikoreksi guru. Laporan nilai langsung jadi.',
    tag: 'Penilaian',
  },
  {
    icon: FaUserTie,
    color: 'from-violet-500 to-purple-600',
    title: 'Multi-Role & Jadwal',
    desc: 'Hak akses terpisah untuk Admin, Guru, dan Siswa. Jadwal ujian fleksibel dengan durasi otomatis.',
    tag: 'Manajemen',
  },
];

function BentoFeatures() {
  return (
    <section id="fitur" className="relative overflow-hidden bg-slate-50 py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-80 w-80 translate-x-1/3 -translate-y-1/3 rounded-full bg-indigo-200/40 blur-[90px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 rounded-full bg-violet-200/40 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="reveal inline-block rounded-full bg-indigo-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600">
            Fitur Unggulan
          </span>
          <h2 className="reveal mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
            Semua yang sekolah butuhkan, <span className="text-gradient">dalam satu platform</span>
          </h2>
          <p className="reveal mt-4 text-base leading-relaxed text-slate-600 sm:text-lg" style={{ '--reveal-delay': '160ms' } as CSSProperties}>
            Dirancang khusus untuk menjaga integritas akademik, memudahkan guru, dan menenangkan siswa saat ujian berlangsung.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className={`reveal group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-900/10 ${
                i === 0 ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''
              }`}
              style={{ '--reveal-delay': `${(i % 3) * 90}ms` } as CSSProperties}
            >
              {/* hover glow */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-200/60 to-violet-200/60 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

              <div className="relative">
                <div className="mb-5 flex items-start justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color} text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <f.icon aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
                {i === 0 && (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <FaShieldAlt aria-hidden="true" />
                    </span>
                    <p className="text-xs font-semibold leading-relaxed text-slate-600">
                      <span className="font-bold text-slate-800">3 lapis proteksi:</span> fullscreen lock, deteksi tab, dan kunci keyboard.
                    </p>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   How it works
   ============================================================ */

const STEPS = [
  {
    icon: FaChalkboardTeacher,
    title: 'Guru menyusun ujian',
    desc: 'Buat bank soal PG & essay, atur jadwal, durasi, dan bobot nilai — semuanya intuitif.',
  },
  {
    icon: FaUserGraduate,
    title: 'Siswa mengerjakan',
    desc: 'Masuk mode fullscreen, soal & opsi diacak otomatis. Jawaban tersimpan tiap langkah.',
  },
  {
    icon: FaChartLine,
    title: 'Nilai langsung jadi',
    desc: 'PG dinilai otomatis, essay dikoreksi guru, laporan siap dibagikan ke orang tua.',
  },
];

function HowItWorks() {
  return (
    <section id="cara-kerja" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="reveal inline-block rounded-full bg-violet-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-violet-600">
            Cara Kerja
          </span>
          <h2 className="reveal mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
            Dari bank soal hingga nilai jadi, <span className="text-gradient">hanya 3 langkah</span>
          </h2>
        </div>

        <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* connector line */}
          <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent md:block" />

          {STEPS.map((s, i) => (
            <div key={s.title} className="reveal relative text-center" style={{ '--reveal-delay': `${i * 120}ms` } as CSSProperties}>
              <div className="relative mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center">
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 opacity-10 blur-md" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-lg shadow-indigo-600/10">
                  <s.icon className="text-xl" aria-hidden="true" />
                </span>
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 font-mono text-[11px] font-bold text-white">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Security section (dark contrast)
   ============================================================ */

const SECURITY_ITEMS = [
  {
    icon: FaUserShield,
    title: 'Mode Fullscreen Wajib',
    desc: 'Ujian hanya bisa dimulai dalam layar penuh. Tekan Esc = terdeteksi.',
  },
  {
    icon: FaEye,
    title: 'Deteksi Perpindahan Tab',
    desc: 'Pindah tab atau aplikasi lain langsung menandai pelanggaran.',
  },
  {
    icon: FaLock,
    title: 'Kunci Otomatis',
    desc: 'Klik kanan, copy, paste, dan shortcut pintasan dinonaktifkan.',
  },
  {
    icon: FaSyncAlt,
    title: 'Reset oleh Pengawas',
    desc: 'Sesi terblokir hanya bisa dibuka kembali oleh Admin / pengawas.',
  },
];

function Security() {
  return (
    <section id="keamanan" className="relative overflow-hidden bg-ink-950 py-20 text-white sm:py-28">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 animate-blob rounded-full bg-indigo-600/25 blur-[110px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 animate-blob-slow rounded-full bg-violet-600/25 blur-[110px]" />
        <div className="absolute inset-0 bg-dots-light opacity-40 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
        <div>
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300">
            <FaShieldAlt className="text-xs" aria-hidden="true" />
            Keamanan Tingkat Tinggi
          </span>
          <h2 className="reveal mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
            Ujian dijaga ketat,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
              dari sisi perangkat hingga server.
            </span>
          </h2>
          <p className="reveal mt-5 max-w-lg text-base leading-relaxed text-slate-300" style={{ '--reveal-delay': '160ms' } as CSSProperties}>
            Anti-cheat bawaan bekerja langsung di browser siswa. Saat terjadi pelanggaran, ujian otomatis dibekukan dan hanya pengawas yang bisa membukanya kembali.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {SECURITY_ITEMS.map((s, i) => (
              <li key={s.title} className="reveal group flex gap-3.5" style={{ '--reveal-delay': `${i * 80}ms` } as CSSProperties}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-indigo-300 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
                  <s.icon className="text-sm" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Blocked screen mock */}
        <div className="reveal" style={{ '--reveal-delay': '200ms' } as CSSProperties}>
          <div className="relative mx-auto max-w-md">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  cbt.sekolah.id · monitor
                </span>
              </div>

              <div className="relative p-6">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.06)_0,rgba(244,63,94,0.06)_10px,transparent_10px,transparent_20px)]" />

                <div className="relative mx-auto max-w-xs rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
                    <FaExclamationTriangle className="text-2xl" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold tracking-tight text-white">
                    UJIAN TERHENTI
                  </h3>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-rose-200/90">
                    Terdeteksi keluar dari mode fullscreen. Sesi dibekukan otomatis.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold text-rose-300">
                    <span className="animate-tick">●</span> MENUNGGU RESET PENGAWAS
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="font-mono text-lg font-bold text-amber-400">2</p>
                    <p className="text-[10px] font-semibold text-slate-400">Pelanggaran terdeteksi</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="font-mono text-lg font-bold text-emerald-400">1</p>
                    <p className="text-[10px] font-semibold text-slate-400">Sesi menunggu reset</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 left-1/2 flex w-max -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur">
              <FaShieldAlt className="text-emerald-400" aria-hidden="true" />
              <p className="text-xs font-bold text-white">
                Reset instan oleh pengawas · <span className="text-emerald-400">2 klik</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Roles
   ============================================================ */

const ROLES = [
  {
    icon: FaUserTie,
    title: 'Admin',
    color: 'from-indigo-500 to-violet-600',
    items: ['Kelola data siswa, guru & kelas', 'Atur jadwal & sesi ujian', 'Monitor & buka blokir peserta', 'Laporan ujian menyeluruh'],
  },
  {
    icon: FaChalkboardTeacher,
    title: 'Guru',
    color: 'from-emerald-500 to-teal-600',
    items: ['Buat bank soal PG & essay', 'Atur bobot nilai per soal', 'Koreksi essay & lihat hasil', 'Dukungan gambar & rumus'],
  },
  {
    icon: FaUserGraduate,
    title: 'Siswa',
    color: 'from-amber-500 to-orange-600',
    items: ['Lihat daftar ujian terjadwal', 'Kerjakan dalam mode aman', 'Navigasi soal & ragu-ragu', 'Hasil langsung setelah selesai'],
  },
];

function Roles() {
  return (
    <section id="peran" className="relative bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="reveal inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600">
            Tiga Peran
          </span>
          <h2 className="reveal mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
            Satu platform, <span className="text-gradient">tiga peran yang saling terhubung</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <article
              key={r.title}
              className="reveal group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-900/10"
              style={{ '--reveal-delay': `${i * 110}ms` } as CSSProperties}
            >
              <span className={`inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br ${r.color} p-3.5 text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <r.icon className="text-xl" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold text-slate-900">{r.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {r.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <FaCheck className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-100/70 to-violet-100/70 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Testimonials
   ============================================================ */

const TESTIMONIALS = [
  {
    quote: 'Sebelumnya khawatir siswa bisa menyontek saat ujian online. Dengan mode fullscreen dan deteksi tab, ujian jadi jauh lebih tenang dan terpercaya.',
    name: 'Ibu Sri Wahyuni',
    role: 'Kepala Sekolah · SMPN 12 Jakarta',
    color: 'bg-indigo-500',
  },
  {
    quote: 'Membuat soal dan mengoreksi essay kini jauh lebih cepat. Nilai pilihan ganda langsung keluar otomatis, laporan pun tinggal unduh.',
    name: 'Bapak Andi Saputra',
    role: 'Guru Matematika · SMA Harapan Bangsa',
    color: 'bg-emerald-500',
  },
];

function Testimonials() {
  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="reveal inline-block rounded-full bg-sky-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-600">
            Kata Mereka
          </span>
          <h2 className="reveal mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" style={{ '--reveal-delay': '80ms' } as CSSProperties}>
            Dipercaya sekolah di <span className="text-gradient">seluruh Indonesia</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              className="reveal relative rounded-3xl border border-slate-200/80 bg-slate-50 p-8 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
              style={{ '--reveal-delay': `${i * 120}ms` } as CSSProperties}
            >
              <FaRocket className="absolute right-6 top-6 text-xl text-indigo-200" aria-hidden="true" />
              <div className="flex gap-1 text-amber-400" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, s) => (
                  <span key={s}>★</span>
                ))}
              </div>
              <blockquote className="mt-4 text-base font-medium leading-relaxed text-slate-700">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${t.color} text-sm font-bold text-white`}>
                  {t.name.split(' ').slice(-1)[0] === 'Wahyuni' ? 'SW' : 'AS'}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs font-medium text-slate-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CTA + Footer
   ============================================================ */

function CTA() {
  const user = useAuthStore((s) => s.user);

  return (
    <section className="relative bg-white pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 px-8 py-16 text-center shadow-2xl shadow-indigo-600/30 sm:px-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute inset-0 bg-dots-light opacity-30" />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Siap menyelenggarakan ujian digital yang aman &amp; tenang?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-indigo-100">
              Bergabunglah bersama 500+ sekolah yang sudah mempercayakan ujiannya pada CBT Sekolah. Gratis untuk tahap percobaan.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Link
                to={homePathForRole(user.role)}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-indigo-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:w-auto"
              >
                Buka Dashboard
                <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ) : (
                <Link
                  to="/login"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-indigo-700 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:w-auto"
                >
                  Coba Sekarang Gratis
                  <FaArrowRight className="text-sm transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              )}
              <a
                href="#fitur"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-8 py-4 text-base font-bold text-white backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 sm:w-auto"
              >
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink-950 pt-16 text-slate-400">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-10 pb-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <a href="#" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30">
                <FaShieldAlt className="text-sm" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-white">
                CBT<span className="text-indigo-400"> Sekolah</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Platform ujian digital untuk sekolah Indonesia. Menjaga integritas akademik dengan teknologi anti-cheat, offline resilience, dan manajemen yang mudah.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold w-max">
              <FaWifi className="text-emerald-400" aria-hidden="true" />
              Semua layanan beroperasi penuh ·{' '}
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-emerald-400">Online</span>
            </div>
          </div>

          {[
            { title: 'Produk', links: ['Fitur', 'Keamanan', 'Cara Kerja', 'Peran'] },
            { title: 'Perusahaan', links: ['Tentang Kami', 'Blog', 'Karier', 'Kontak'] },
            { title: 'Dukungan', links: ['Pusat Bantuan', 'Dokumentasi', 'Status Layanan', 'Kebijakan Privasi'] },
          ].map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-7 sm:flex-row">
          <p className="text-xs font-medium text-slate-500">
            &copy; {new Date().getFullYear()} CBT Sekolah. Dibangun dengan Laravel &amp; React.
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-500">
            <FaRocket className="text-indigo-400" aria-hidden="true" />
            v2.0 · anti-cheat active
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function LandingPage() {
  useRevealObserver();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafbff] font-sans text-slate-900 antialiased">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <StatsBand />
        <BentoFeatures />
        <HowItWorks />
        <Security />
        <Roles />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
