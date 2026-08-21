import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaArrowLeft,
  FaUserGraduate,
  FaSave,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaUser,
} from 'react-icons/fa';
import { fetchStudentProfile, updateStudentProfile, logoutRequest, type StudentProfile } from './api/client';
import { useAuthStore } from './store/authStore';

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

const primaryBtnCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-60';

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['student-profile'],
    queryFn: fetchStudentProfile,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form when profile loads
  const [initialized, setInitialized] = useState(false);
  if (profile && !initialized) {
    setName(profile.name);
    setEmail(profile.email);
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      updateStudentProfile({
        name,
        email,
        ...(currentPassword && newPassword
          ? {
              current_password: currentPassword,
              password: newPassword,
              password_confirmation: confirmPassword,
            }
          : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      setError(null);
      setSuccess('Profil berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal memperbarui profil.');
      setSuccess(null);
    },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#fafbff] font-sans text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
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

      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
        >
          <FaArrowLeft className="text-xs" /> Kembali ke Dashboard
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Profil Saya</h1>

        {isError && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>Gagal memuat profil. Coba lagi nanti.</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-medium text-emerald-700">
            <FaCheckCircle className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && !success && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="mt-10 flex justify-center">
            <FaSpinner className="animate-spin text-3xl text-indigo-500" />
          </div>
        ) : profile ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Profile Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/20">
                  <FaUserGraduate className="text-2xl" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{profile.name}</h2>
                  <p className="text-sm font-medium text-slate-500">{profile.class_name ?? 'Belum ada kelas'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    <FaUser className="mr-1.5 inline text-indigo-400" /> Nama Lengkap
                  </label>
                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    <FaEnvelope className="mr-1.5 inline text-indigo-400" /> Email
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Change */}
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">
                <FaLock className="mr-2 inline text-indigo-400" />
                Ubah Password
              </h3>
              <p className="mb-4 text-sm text-slate-500">Kosongkan jika tidak ingin mengubah password.</p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password Saat Ini</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password Baru</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    className={inputCls}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={updateMutation.isPending} className={primaryBtnCls}>
                {updateMutation.isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
                Simpan Perubahan
              </button>
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
}
