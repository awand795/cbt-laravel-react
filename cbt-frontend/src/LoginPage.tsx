import { useState } from 'react';
import {
  FaShieldAlt,
  FaSignInAlt,
  FaGoogle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaCheckCircle,
  FaUserShield,
  FaLock,
  FaGraduationCap,
  FaSpinner,
  FaExclamationCircle,
} from 'react-icons/fa';
import axios from 'axios';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useRevealObserver } from './hooks/useReveal';
import { loginRequest } from './api/client';
import { useAuthStore } from './store/authStore';
import { homePathForRole } from './router/guards';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@cbt.com', color: 'bg-indigo-500', icon: FaUserShield },
  { role: 'Guru', email: 'guru@cbt.com', color: 'bg-emerald-500', icon: FaGraduationCap },
  { role: 'Siswa', email: 'siswa@cbt.com', color: 'bg-amber-500', icon: FaLock },
];

const QUICK_FACTS = [
  'Anti-cheat & fullscreen lock otomatis',
  'Auto-save offline tanpa takut putus koneksi',
  'Nilai langsung jadi setelah ujian selesai',
];

export default function LoginPage() {
  useRevealObserver();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginRequest(email, password);
      if (res.success && res.data) {
        setAuth(res.data.token, res.data.user);
        const redirectTarget = search.redirect?.startsWith('/') ? search.redirect : null;
        navigate({
          to: redirectTarget ?? homePathForRole(res.data.user.role),
        });
      } else {
        setError(res.message || 'Login gagal. Silakan coba lagi.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Tidak dapat terhubung ke server. Pastikan backend berjalan.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('password');
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#fafbff] font-sans text-slate-900 antialiased">
      {/* ===== Left panel — branding (hidden on mobile) ===== */}
      <div className="relative hidden w-1/2 overflow-hidden bg-ink-950 lg:block">
        {/* background atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-indigo-600/30 blur-[110px]" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 animate-blob-slow rounded-full bg-violet-600/30 blur-[110px]" />
          <div className="absolute inset-0 bg-dots-light opacity-40 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,black,transparent)]" />
        </div>

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          {/* back link */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
            >
              <FaArrowLeft className="text-xs" aria-hidden="true" /> Kembali ke Beranda
            </Link>

            <div className="mt-14">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300">
                <FaShieldAlt className="text-xs" aria-hidden="true" />
                Portal CBT Sekolah
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
                Selamat datang kembali,
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
                  pembelajar tangguh.
                </span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-400">
                Masuk ke portal untuk mengikuti ujian, mengelola soal, atau memantau jalannya ujian secara real-time.
              </p>

              <ul className="mt-8 space-y-3.5">
                {QUICK_FACTS.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm font-medium text-slate-300">
                    <FaCheckCircle className="shrink-0 text-emerald-400" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* mini exam card */}
          <div className="reveal relative mx-auto w-full max-w-sm">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Matematika · UTS
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400 ring-1 ring-amber-500/30">
                  ⏱ 12:47
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1.5 p-5">
                {Array.from({ length: 40 }).map((_, i) => (
                  <span
                    key={i}
                    className={`flex h-6 items-center justify-center rounded-md font-mono text-[9px] font-bold ${
                      i < 24
                        ? 'bg-emerald-500 text-white'
                        : i === 25
                          ? 'bg-amber-400 text-amber-950'
                          : 'bg-white/5 text-slate-500 ring-1 ring-white/10'
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-emerald-400 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Mode aman aktif
            </div>
          </div>
        </div>
      </div>

      {/* ===== Right panel — form ===== */}
      <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        {/* top-right logo (mobile & desktop) */}
        <Link
          to="/"
          className="absolute right-6 top-6 flex items-center gap-2 lg:right-10 lg:top-8"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30">
            <FaShieldAlt className="text-sm" aria-hidden="true" />
          </span>
          <span className="hidden text-base font-extrabold tracking-tight text-slate-900 sm:block">
            CBT<span className="text-indigo-600"> Sekolah</span>
          </span>
        </Link>

        <div className="reveal w-full max-w-md">
          <div className="mb-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600">
              <FaSignInAlt className="text-[10px]" aria-hidden="true" /> Masuk Portal
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
              Masuk ke akun Anda
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Pilih peran, atau gunakan akun demo di bawah untuk mencoba.
            </p>
          </div>

          {/* Demo accounts */}
          <div className="mb-7">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              Akun percobaan
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleDemoFill(acc.email)}
                  className={`group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-600/10 ${
                    email === acc.email ? 'border-indigo-400 ring-2 ring-indigo-200' : ''
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${acc.color} text-sm text-white shadow-md transition-transform group-hover:scale-110`}>
                    <acc.icon aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-slate-700">{acc.role}</span>
                  <span className="font-mono text-[9px] font-semibold text-slate-400">
                    {acc.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700"
            >
              <FaExclamationCircle className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <div className="relative group">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
                  <FaEnvelope aria-hidden="true" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 ${
                    focused === 'email'
                      ? 'border-indigo-400 ring-4 ring-indigo-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  placeholder="nama@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <a
                  href="#"
                  className="text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  Lupa kata sandi?
                </a>
              </div>
              <div className="relative group">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
                  <FaLock aria-hidden="true" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full rounded-2xl border bg-white py-3.5 pl-11 pr-12 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 ${
                    focused === 'password'
                      ? 'border-indigo-400 ring-4 ring-indigo-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin text-sm" aria-hidden="true" />
                  Memverifikasi…
                </>
              ) : (
                <>
                  Masuk
                  <FaSignInAlt className="text-sm transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              atau masuk dengan
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <FaGoogle className="text-red-500" aria-hidden="true" />
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <FaEnvelope className="text-slate-700" aria-hidden="true" />
              SSO Sekolah
            </button>
          </div>

          <p className="mt-8 text-center text-xs font-medium text-slate-400">
            Belum punya akun?{' '}
            <Link to="/" className="font-bold text-indigo-600 transition-colors hover:text-indigo-700">
              Hubungi admin sekolah Anda
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
