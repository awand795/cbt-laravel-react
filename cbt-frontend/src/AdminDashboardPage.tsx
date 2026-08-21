import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaUsers,
  FaLayerGroup,
  FaClipboardList,
  FaTv,
  FaLock,
  FaUnlock,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaSearch,
  FaTimes,
  FaDatabase,
  FaPlay,
  FaPause,
  FaWifi,
} from 'react-icons/fa';
import {
  createClass,
  createExam,
  createSubject,
  createUser,
  deleteClass,
  deleteExam,
  deleteSubject,
  deleteUser,
  fetchAdminExams,
  fetchAdminStats,
  fetchAnalyticsOverview,
  fetchBlockedSessions,
  fetchClasses,
  fetchGradebook,
  fetchLiveMonitor,
  fetchSubjects,
  fetchUsers,
  getExportUrl,
  getGradebookExportUrl,
  getTemplateUrl,
  importStudentsCsv,
  importQuestionsCsv,
  extendSessionTime,
  unblockSession,
  updateClass,
  updateExam,
  updateExamStatus,
  updateSubject,
  updateUser,
  type AdminExam,
  type AnalyticsOverview,
  type ClassroomRecord,
  type GradebookClass,
  type SubjectRecord,
  type UserRecord,
} from './api/client';
import { getEcho, type MonitorEvent, type MonitorSession } from './api/realtime';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

type Tab = 'overview' | 'users' | 'subjects' | 'classes' | 'exams' | 'live' | 'blocked' | 'analytics' | 'gradebook' | 'import';

const TABS: { id: Tab; label: string; icon: typeof FaTv }[] = [
  { id: 'overview', label: 'Ringkasan', icon: FaTv },
  { id: 'users', label: 'Pengguna', icon: FaUsers },
  { id: 'subjects', label: 'Mapel', icon: FaLayerGroup },
  { id: 'classes', label: 'Kelas', icon: FaUsers },
  { id: 'exams', label: 'Ujian', icon: FaClipboardList },
  { id: 'live', label: 'Live Monitor', icon: FaTv },
  { id: 'blocked', label: 'Terblokir', icon: FaLock },
  { id: 'analytics', label: 'Analitik', icon: FaTv },
  { id: 'gradebook', label: 'Buku Nilai', icon: FaClipboardList },
  { id: 'import', label: 'Import/Export', icon: FaDatabase },
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-indigo-50 text-indigo-600 ring-indigo-200' },
  teacher: { label: 'Guru', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  student: { label: 'Siswa', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

const GRADIENT_ICONS = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-cyan-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

const EXAM_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draf', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  published: { label: 'Terbit', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Ditutup', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
};

const SESSION_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  ongoing: { label: 'Sedang Ujian', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  finished: { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  blocked: { label: 'Terblokir', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
};

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

function formatDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ============ Shared small components ============ */

function Badge({ cls, dot, children }: { cls: string; dot?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cls}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
            aria-label="Tutup"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

const primaryBtnCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-60';

function AlertBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-700"
    >
      <FaExclamationTriangle className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/* ============ Overview tab ============ */

function Overview({ goTo }: { goTo: (t: Tab) => void }) {
  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-8 py-14 text-center shadow-sm">
        <FaExclamationTriangle className="text-2xl text-rose-500" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-slate-600">{error instanceof Error ? error.message : 'Gagal memuat statistik.'}</p>
        <button type="button" onClick={() => refetch()} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
          Coba Lagi
        </button>
      </div>
    );
  }

  const cards = [
    { label: 'Siswa', value: stats?.students ?? 0, icon: FaUserGraduate, grad: 'from-indigo-500 to-violet-600' },
    { label: 'Kelas', value: stats?.classes ?? 0, icon: FaUsers, grad: 'from-emerald-500 to-teal-600' },
    { label: 'Guru', value: stats?.teachers ?? 0, icon: FaChalkboardTeacher, grad: 'from-sky-500 to-cyan-600' },
    { label: 'Mata Pelajaran', value: stats?.subjects ?? 0, icon: FaLayerGroup, grad: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-100/60 to-violet-100/60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative flex items-center justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.grad} text-sm text-white shadow-lg shadow-slate-900/10`}>
                <c.icon aria-hidden="true" />
              </span>
            </div>
            <p className="relative mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900">
              {isLoading ? '…' : c.value}
            </p>
            <p className="relative mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Session status */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">Status Sesi Ujian</h3>
            <button
              type="button"
              onClick={() => goTo('live')}
              className="text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Lihat monitor →
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {[
              { key: 'ongoing' as const, label: 'Sedang berlangsung', value: stats?.sessions.ongoing ?? 0, color: 'text-emerald-600', bar: 'bg-emerald-500' },
              { key: 'finished' as const, label: 'Selesai', value: stats?.sessions.finished ?? 0, color: 'text-slate-600', bar: 'bg-slate-400' },
              { key: 'blocked' as const, label: 'Terblokir', value: stats?.sessions.blocked ?? 0, color: 'text-rose-600', bar: 'bg-rose-500' },
            ].map((row) => {
              const total = Math.max(1, (stats?.sessions.ongoing ?? 0) + (stats?.sessions.finished ?? 0) + (stats?.sessions.blocked ?? 0));
              const pct = Math.round(((row.value ?? 0) / total) * 100);
              return (
                <div key={row.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">{row.label}</span>
                    <span className={`font-mono font-bold tabular-nums ${row.color}`}>{row.value ?? 0}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${row.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">Aktivitas Terbaru</h3>
            <FaClock className="text-slate-300" aria-hidden="true" />
          </div>
          {!stats || stats.recent_sessions.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-slate-400">Belum ada aktivitas ujian.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {stats.recent_sessions.map((s) => {
                const cfg = SESSION_STATUS[s.status] ?? SESSION_STATUS.finished;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{s.user_name ?? 'Siswa'}</p>
                      <p className="truncate text-xs font-medium text-slate-400">{s.exam_title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.cheat_count > 0 && (
                        <span className="font-mono text-[10px] font-bold text-rose-400">{s.cheat_count}× ⚠</span>
                      )}
                      <Badge cls={cfg.cls} dot={cfg.dot}>{cfg.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Users tab ============ */

function UsersTab() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', class_id: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => fetchUsers(roleFilter === 'all' ? undefined : roleFilter),
  });

  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: fetchClasses });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateUser(editing.id, {
            name: form.name,
            email: form.email,
            role: form.role as UserRecord['role'],
            password: form.password || undefined,
            class_id: form.class_id ? Number(form.class_id) : null,
          })
        : createUser({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role as UserRecord['role'],
            class_id: form.class_id ? Number(form.class_id) : null,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setCreating(false);
      setEditing(null);
      setForm({ name: '', email: '', password: '', role: 'student', class_id: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan pengguna.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menghapus pengguna.');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'student', class_id: '' });
    setError(null);
    setCreating(true);
  };

  const openEdit = (u: UserRecord) => {
    setCreating(true);
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, class_id: u.class_id ? String(u.class_id) : '' });
    setError(null);
  };

  const counts = useMemo(() => {
    const c = { admin: 0, teacher: 0, student: 0, all: users?.length ?? 0 };
    users?.forEach((u) => { c[u.role] += 1; });
    return c;
  }, [users]);

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                roleFilter === r
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {r === 'all' ? 'Semua' : ROLE_BADGE[r].label}
              <span className="ml-1.5 font-mono opacity-70">{counts[r]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={openCreate} className={primaryBtnCls}>
          <FaPlus aria-hidden="true" /> Tambah Pengguna
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Nama</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Peran</th>
                <th className="px-5 py-3.5">Kelas</th>
                <th className="px-5 py-3.5">Dibuat</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" />
                  </td>
                </tr>
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm font-medium text-slate-400">
                    Tidak ada pengguna dengan filter ini.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const badge = ROLE_BADGE[u.role];
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-5 py-3.5 font-bold text-slate-800">{u.name}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-500">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${badge.cls}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.class_name ? (
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">{u.class_name}</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(u)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label={`Edit ${u.name}`}
                          >
                            <FaEdit className="text-xs" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus pengguna "${u.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
                                deleteMutation.mutate(u.id);
                              }
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${u.name}`}
                          >
                            <FaTrash className="text-xs" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <Modal
          title={editing ? 'Edit Pengguna' : 'Tambah Pengguna'}
          subtitle={editing ? `Memperbarui akun ${editing.email}` : 'Buat akun baru untuk siswa, guru, atau admin.'}
          onClose={() => setCreating(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Lengkap</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="cth: Budi Santoso" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="nama@sekolah.sch.id" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Kata Sandi {editing && <span className="font-normal text-slate-400">(kosongkan jika tidak diganti)</span>}
              </label>
              <input type="password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={8} placeholder="minimal 8 karakter" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peran</label>
              <div className="grid grid-cols-3 gap-2">
                {(['student', 'teacher', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`rounded-2xl border px-3 py-3 text-xs font-bold transition-all duration-200 ${
                      form.role === r
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {ROLE_BADGE[r].label}
                  </button>
                ))}
              </div>
            </div>

            {form.role === 'student' && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kelas</label>
                <select
                  className={inputCls}
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                >
                  <option value="">Belum ada kelas</option>
                  {classes?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
                Batal
              </button>
              <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                {saveMutation.isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                {editing ? 'Simpan Perubahan' : 'Buat Pengguna'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============ Subjects tab ============ */

function SubjectsTab() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: subjects, isLoading } = useQuery({ queryKey: ['admin-subjects'], queryFn: fetchSubjects });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateSubject(editing.id, { name: form.name, code: form.code || undefined })
        : createSubject({ name: form.name, code: form.code || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setCreating(false);
      setEditing(null);
      setForm({ name: '', code: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan mata pelajaran.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menghapus mata pelajaran.');
    },
  });

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}
      <div className="flex justify-end">
        <button
          type="button"
          className={primaryBtnCls}
          onClick={() => {
            setEditing(null);
            setForm({ name: '', code: '' });
            setError(null);
            setCreating(true);
          }}
        >
          <FaPlus aria-hidden="true" /> Tambah Mapel
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Nama</th>
              <th className="px-5 py-3.5">Kode</th>
              <th className="px-5 py-3.5">Jumlah Ujian</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
            ) : !subjects || subjects.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm font-medium text-slate-400">Belum ada mata pelajaran. Tambahkan yang pertama!</td></tr>
            ) : (
              subjects.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-5 py-3.5 font-bold text-slate-800">{s.name}</td>
                  <td className="px-5 py-3.5">
                    {s.code ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">{s.code}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-500">{s.exams_count ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(s);
                          setForm({ name: s.name, code: s.code ?? '' });
                          setError(null);
                          setCreating(true);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label={`Edit ${s.name}`}
                      >
                        <FaEdit className="text-xs" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus mata pelajaran "${s.name}"?`)) deleteMutation.mutate(s.id);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Hapus ${s.name}`}
                      >
                        <FaTrash className="text-xs" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal
          title={editing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
          onClose={() => setCreating(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Mapel</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="cth: Matematika Dasar" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kode (opsional)</label>
              <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="cth: MTK-01" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                {saveMutation.isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Mapel'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============ Classes tab (Kelas) ============ */

function ClassesTab() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClassroomRecord | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: classes, isLoading } = useQuery({ queryKey: ['admin-classes'], queryFn: fetchClasses });

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? updateClass(editing.id, { name: form.name, code: form.code || undefined })
        : createClass({ name: form.name, code: form.code || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setCreating(false);
      setEditing(null);
      setForm({ name: '', code: '' });
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan kelas.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menghapus kelas.');
    },
  });

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}
      <div className="flex justify-end">
        <button
          type="button"
          className={primaryBtnCls}
          onClick={() => {
            setEditing(null);
            setForm({ name: '', code: '' });
            setError(null);
            setCreating(true);
          }}
        >
          <FaPlus aria-hidden="true" /> Tambah Kelas
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Nama</th>
              <th className="px-5 py-3.5">Kode</th>
              <th className="px-5 py-3.5">Jumlah Siswa</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
            ) : !classes || classes.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-sm font-medium text-slate-400">Belum ada kelas. Buat kelas untuk mengelompokkan siswa dan menetapkan ujian.</td></tr>
            ) : (
              classes.map((c, i) => (
                <tr key={c.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${GRADIENT_ICONS[i % GRADIENT_ICONS.length]} text-xs font-bold text-white shadow-md`}>
                        {c.code?.slice(0, 2) ?? c.name.slice(0, 2)}
                      </span>
                      <span className="font-bold text-slate-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {c.code ? (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-600">{c.code}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-500">{c.students_count ?? 0} siswa</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(c);
                          setForm({ name: c.name, code: c.code ?? '' });
                          setError(null);
                          setCreating(true);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        aria-label={`Edit ${c.name}`}
                      >
                        <FaEdit className="text-xs" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Hapus kelas "${c.name}"?`)) deleteMutation.mutate(c.id);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Hapus ${c.name}`}
                      >
                        <FaTrash className="text-xs" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal
          title={editing ? 'Edit Kelas' : 'Tambah Kelas'}
          subtitle="Kelas dipakai untuk mengelompokkan siswa dan menetapkan ujian tertentu."
          onClose={() => setCreating(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nama Kelas</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="cth: Kelas IX-A" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kode (opsional)</label>
              <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="cth: IX-A" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                {saveMutation.isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Kelas'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============ Exams tab ============ */

function ExamsTab() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject_id: '',
    title: '',
    description: '',
    duration_minutes: '60',
    start_time: '',
    end_time: '',
    status: 'draft',
    class_ids: [] as number[],
  });

  const { data: exams, isLoading } = useQuery({ queryKey: ['admin-exams'], queryFn: fetchAdminExams });
  const { data: subjects } = useQuery({ queryKey: ['admin-subjects'], queryFn: fetchSubjects });
  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: fetchClasses });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        subject_id: Number(form.subject_id),
        title: form.title,
        description: form.description || null,
        duration_minutes: Number(form.duration_minutes),
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        status: form.status as 'draft' | 'published' | 'closed',
        class_ids: form.class_ids,
      };
      return editing ? updateExam(editing.id, payload) : createExam(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setCreating(false);
      setEditing(null);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan ujian.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'draft' | 'published' | 'closed' }) => updateExamStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal mengubah status ujian.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-exams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menghapus ujian.');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ subject_id: subjects?.[0] ? String(subjects[0].id) : '', title: '', description: '', duration_minutes: '60', start_time: '', end_time: '', status: 'draft', class_ids: [] });
    setError(null);
    setCreating(true);
  };

  const openEdit = (e: AdminExam) => {
    setCreating(true);
    setEditing(e);
    setForm({
      subject_id: String(e.subject_id),
      title: e.title,
      description: e.description ?? '',
      duration_minutes: String(e.duration_minutes),
      start_time: formatDateTimeLocal(e.start_time),
      end_time: formatDateTimeLocal(e.end_time),
      status: e.status,
      class_ids: [...e.class_ids],
    });
    setError(null);
  };

  const toggleClass = (id: number) => {
    setForm((prev) => ({
      ...prev,
      class_ids: prev.class_ids.includes(id)
        ? prev.class_ids.filter((x) => x !== id)
        : [...prev.class_ids, id],
    }));
  };

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}
      <div className="flex justify-end">
        <button type="button" className={primaryBtnCls} onClick={openCreate}>
          <FaPlus aria-hidden="true" /> Jadwalkan Ujian
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Ujian</th>
                <th className="px-5 py-3.5">Mapel</th>
                <th className="px-5 py-3.5">Durasi</th>
                <th className="px-5 py-3.5">Jadwal</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
              ) : !exams || exams.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-medium text-slate-400">Belum ada ujian. Jadwalkan ujian pertama Anda!</td></tr>
              ) : (
                exams.map((e) => {
                  const st = EXAM_STATUS[e.status] ?? EXAM_STATUS.draft;
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{e.title}</p>
                        <p className="text-xs font-medium text-slate-400">{e.questions_count} soal · {e.sessions_count} peserta</p>
                        {e.class_names.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {e.class_names.map((cn) => (
                              <span key={cn} className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                                {cn}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {e.subject_code ? (
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">{e.subject_code}</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">{e.subject ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-500">{e.duration_minutes} mnt</td>
                      <td className="px-5 py-3.5 text-xs font-medium text-slate-500">
                        <p>{formatDate(e.start_time)}</p>
                        <p className="text-slate-300">s/d {formatDate(e.end_time)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge cls={st.cls} dot={st.dot}>{st.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => statusMutation.mutate({ id: e.id, status: e.status === 'published' ? 'closed' : 'published' })}
                            disabled={statusMutation.isPending}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                            aria-label={e.status === 'published' ? 'Tutup ujian' : 'Terbitkan ujian'}
                            title={e.status === 'published' ? 'Tutup ujian' : 'Terbitkan ujian'}
                          >
                            {e.status === 'published' ? <FaPause className="text-xs" aria-hidden="true" /> : <FaPlay className="text-xs" aria-hidden="true" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(e)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                            aria-label={`Edit ${e.title}`}
                          >
                            <FaEdit className="text-xs" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus ujian "${e.title}" beserta seluruh soalnya?`)) deleteMutation.mutate(e.id);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Hapus ${e.title}`}
                          >
                            <FaTrash className="text-xs" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <Modal
          title={editing ? 'Edit Ujian' : 'Jadwalkan Ujian'}
          subtitle="Atur judul, mapel, durasi, dan jendela waktu pelaksanaan."
          onClose={() => setCreating(false)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
          >
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Judul Ujian</label>
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="cth: Ujian Akhir Semester Matematika" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mata Pelajaran</label>
                <select className={inputCls} value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
                  <option value="">Pilih mapel…</option>
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Durasi (menit)</label>
                <input type="number" min={1} max={1440} className={inputCls} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Deskripsi (opsional)</label>
              <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Petunjuk singkat untuk peserta…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mulai</label>
                <input type="datetime-local" className={inputCls} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Berakhir</label>
                <input type="datetime-local" className={inputCls} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['draft', 'published', 'closed'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={`rounded-2xl border px-3 py-3 text-xs font-bold transition-all duration-200 ${
                      form.status === s
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {EXAM_STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Kelas Peserta <span className="font-normal text-slate-400">(kosongkan = semua kelas)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {classes?.map((c) => {
                  const active = form.class_ids.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleClass(c.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {c.code ?? c.name}
                    </button>
                  );
                })}
                {(!classes || classes.length === 0) && (
                  <p className="text-xs font-medium text-slate-400">Belum ada kelas. Buat kelas di tab Kelas terlebih dahulu.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                {saveMutation.isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                {editing ? 'Simpan Perubahan' : 'Simpan Ujian'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============ Live monitor tab ============ */

const EVENT_LABEL: Record<MonitorEvent['type'], string> = {
  start: 'mulai mengerjakan',
  blocked: 'terblokir karena pelanggaran',
  unblocked: 'dibuka kembali oleh admin',
  finished: 'mengumpulkan ujian',
};

function LiveMonitorTab() {
  const queryClient = useQueryClient();
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [wsSessions, setWsSessions] = useState<Record<number, MonitorSession>>({});
  const [lastEvent, setLastEvent] = useState<MonitorEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const { data: exams } = useQuery({ queryKey: ['admin-exams'], queryFn: fetchAdminExams });

  const activeExamId = selectedExamId ?? exams?.[0]?.id ?? null;

  // Snapshot awal (satu kali) — update berikutnya murni dari WebSocket
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['live-monitor', activeExamId],
    queryFn: () => fetchLiveMonitor(activeExamId!),
    enabled: activeExamId != null,
  });

  // Berlangganan channel privat admin.monitor (WebSocket Reverb)
  useEffect(() => {
    const echo = getEcho();
    setConnected(echo.connectionStatus() === 'connected');
    const off = echo.connector.onConnectionChange(() => setConnected(echo.connectionStatus() === 'connected'));

    const channel = echo.private('admin.monitor');
    const handler = (e: MonitorEvent) => {
      setWsSessions((prev) => ({ ...prev, [e.session.id]: e.session }));
      setLastEvent(e);
    };
    channel.listen('App\\Events\\ExamSessionUpdated', handler);

    return () => {
      off();
      echo.leaveChannel('admin.monitor');
    };
  }, []);

  // Gabungkan snapshot REST + update real-time dari WebSocket
  const mergedSessions = useMemo(() => {
    const byId = new Map<number, MonitorSession>();
    (data?.sessions ?? []).forEach((s) => byId.set(s.id, s));
    Object.values(wsSessions)
      .filter((s) => s.exam_id === activeExamId)
      .forEach((s) => byId.set(s.id, s));
    return [...byId.values()].sort((a, b) => b.id - a.id);
  }, [data, wsSessions, activeExamId]);

  const extraCount = useMemo(
    () =>
      Object.values(wsSessions).filter(
        (s) => s.exam_id === activeExamId && !(data?.sessions ?? []).some((x) => x.id === s.id),
      ).length,
    [wsSessions, activeExamId, data],
  );
  const sessionsCount = (data?.exam.sessions_count ?? 0) + extraCount;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" aria-hidden="true" />
          <select
            className={`${inputCls} pl-11`}
            value={activeExamId ?? ''}
            onChange={(e) => setSelectedExamId(Number(e.target.value))}
          >
            {!exams || exams.length === 0 ? (
              <option value="">Belum ada ujian</option>
            ) : (
              exams.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))
            )}
          </select>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ring-1 transition-colors ${
              connected
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}
          >
            {connected ? (
              <>
                <FaWifi aria-hidden="true" /> Live · WebSocket
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </>
            ) : (
              <>
                <FaWifi aria-hidden="true" /> Menghubungkan WebSocket…
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
              </>
            )}
          </span>
          {lastEvent && connected && (
            <span className="text-[11px] font-semibold text-slate-400">
              {lastEvent.session.user_name} — {EVENT_LABEL[lastEvent.type] ?? lastEvent.type} ·{' '}
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {isError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error instanceof Error ? error.message : 'Gagal memuat monitor.'}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <p className="text-sm font-extrabold text-slate-800">{data?.exam.title ?? '—'}</p>
          <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
            <span>{data?.exam.questions_count ?? 0} soal</span>
            <span className="text-slate-300">·</span>
            <span>{sessionsCount} sesi</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Peserta</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Pelanggaran</th>
                <th className="px-5 py-3.5">Mulai</th>
                <th className="px-5 py-3.5">Selesai</th>
                <th className="px-5 py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
              ) : mergedSessions.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm font-medium text-slate-400">Belum ada peserta yang mengikuti ujian ini.</td></tr>
              ) : (
                mergedSessions.map((s) => {
                  const cfg = SESSION_STATUS[s.status] ?? SESSION_STATUS.finished;
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{s.user_name ?? '—'}</p>
                        <p className="text-xs font-medium text-slate-400">{s.user_email}</p>
                      </td>
                      <td className="px-5 py-3.5"><Badge cls={cfg.cls} dot={cfg.dot}>{cfg.label}</Badge></td>
                      <td className="px-5 py-3.5">
                        <span className={`font-mono text-xs font-bold ${s.cheat_count > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {s.cheat_count}×
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{formatDate(s.started_at)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{formatDate(s.finished_at)}</td>
                      <td className="px-5 py-3.5">
                        {s.status === 'ongoing' && (
                          <button
                            type="button"
                            onClick={() => {
                              const mins = prompt('Tambah berapa menit? (1-120)');
                              if (mins && !isNaN(Number(mins)) && Number(mins) > 0) {
                                extendSessionTime(s.id, Number(mins)).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ['live-monitor'] });
                                });
                              }
                            }}
                            className="rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100"
                          >
                            + Waktu
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============ Blocked tab ============ */

function BlockedTab() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['admin-blocked'],
    queryFn: fetchBlockedSessions,
  });

  // Real-time: daftar sesi terblokir langsung segar saat ada event
  // blokir / buka blokir yang masuk lewat WebSocket.
  useEffect(() => {
    const echo = getEcho();
    setConnected(echo.connectionStatus() === 'connected');
    const off = echo.connector.onConnectionChange(() => setConnected(echo.connectionStatus() === 'connected'));

    const channel = echo.private('admin.monitor');
    const handler = (e: MonitorEvent) => {
      if (e.type === 'blocked' || e.type === 'unblocked') {
        queryClient.invalidateQueries({ queryKey: ['admin-blocked'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        queryClient.invalidateQueries({ queryKey: ['live-monitor'] });
      }
    };
    channel.listen('App\\Events\\ExamSessionUpdated', handler);

    return () => {
      off();
      echo.leaveChannel('admin.monitor');
    };
  }, [queryClient]);

  const unblockMutation = useMutation({
    mutationFn: unblockSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-blocked'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['live-monitor'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal membuka blokir sesi.');
    },
  });

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}

      <div className="flex items-center justify-between gap-4 rounded-3xl border border-rose-200 bg-rose-50/60 px-5 py-4">
        <p className="text-sm font-semibold text-rose-700">
          Sesi yang terblokir harus dibuka kembali secara manual oleh admin sebelum siswa dapat melanjutkan ujian.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ${
              connected
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}
          >
            <FaWifi aria-hidden="true" />
            {connected ? 'Live' : 'Menghubungkan…'}
          </span>
          <button type="button" onClick={() => refetch()} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50">
            Segarkan
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Peserta</th>
              <th className="px-5 py-3.5">Ujian</th>
              <th className="px-5 py-3.5">Pelanggaran</th>
              <th className="px-5 py-3.5">Mulai</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
            ) : !sessions || sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <FaCheckCircle className="mx-auto text-2xl text-emerald-500" aria-hidden="true" />
                  <p className="mt-3 text-sm font-bold text-slate-700">Tidak ada sesi terblokir 🎉</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">Semua ujian berjalan lancar tanpa pelanggaran.</p>
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-indigo-50/40">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-800">{s.user_name ?? '—'}</p>
                    <p className="text-xs font-medium text-slate-400">{s.user_email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-600">{s.exam_title ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-mono text-xs font-bold text-rose-600 ring-1 ring-rose-200">
                      <FaExclamationTriangle className="text-[10px]" aria-hidden="true" />
                      {s.cheat_count}×
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{formatDate(s.started_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={unblockMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Buka blokir sesi ${s.user_name}? Siswa dapat langsung melanjutkan ujian.`)) {
                            unblockMutation.mutate(s.id);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        {unblockMutation.isPending && unblockMutation.variables === s.id ? (
                          <FaSpinner className="animate-spin" aria-hidden="true" />
                        ) : (
                          <FaUnlock aria-hidden="true" />
                        )}
                        Buka Blokir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ Analytics Tab ============ */

function AnalyticsTab() {
  const { data: analytics, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: fetchAnalyticsOverview,
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><FaSpinner className="animate-spin text-3xl text-indigo-500" /></div>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-8 py-14 text-center shadow-sm">
        <FaExclamationTriangle className="text-2xl text-rose-500" />
        <p className="mt-3 text-sm font-semibold text-slate-600">{error instanceof Error ? error.message : 'Gagal memuat analitik.'}</p>
        <button type="button" onClick={() => refetch()} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">Coba Lagi</button>
      </div>
    );
  }

  const dist = analytics?.score_distribution ?? {};
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Ujian', value: analytics?.total_exams ?? 0, grad: 'from-indigo-500 to-violet-600' },
          { label: 'Total Sesi', value: analytics?.total_sessions ?? 0, grad: 'from-emerald-500 to-teal-600' },
          { label: 'Selesai', value: analytics?.finished_sessions ?? 0, grad: 'from-sky-500 to-cyan-600' },
          { label: 'Rata-rata Nilai', value: analytics?.average_score != null ? `${analytics.average_score}%` : '—', grad: 'from-amber-500 to-orange-600' },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.grad} text-sm text-white shadow-lg`}>📊</span>
            <p className="mt-4 font-mono text-3xl font-bold tabular-nums tracking-tight text-slate-900">{c.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Score Distribution */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-4">Distribusi Nilai</h3>
        <div className="space-y-3">
          {['0-20', '21-40', '41-60', '61-80', '81-100'].map((range) => {
            const count = dist[range] ?? 0;
            const pct = Math.round((count / distTotal) * 100);
            const colors = ['bg-rose-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-indigo-500'];
            const idx = ['0-20', '21-40', '41-60', '61-80', '81-100'].indexOf(range);
            return (
              <div key={range}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">{range}</span>
                  <span className="font-mono font-bold text-slate-700">{count} ({pct}%)</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${colors[idx]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exams per Subject */}
      {analytics?.exams_per_subject && Object.keys(analytics.exams_per_subject).length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-4">Ujian per Mata Pelajaran</h3>
          <div className="space-y-2">
            {Object.entries(analytics.exams_per_subject).map(([subject, count]) => (
              <div key={subject} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                <span className="text-sm font-bold text-slate-700">{subject}</span>
                <span className="font-mono text-sm font-bold text-indigo-600">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Chart */}
      {analytics?.activity_last_30_days && analytics.activity_last_30_days.length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-4">Aktivitas 30 Hari Terakhir</h3>
          <div className="flex items-end gap-1 h-32">
            {analytics.activity_last_30_days.map((d) => {
              const maxCount = Math.max(...analytics.activity_last_30_days.map((x) => x.count), 1);
              const height = Math.max(4, (d.count / maxCount) * 100);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} sesi`}>
                  <span className="text-[9px] font-bold text-slate-400">{d.count}</span>
                  <div className="w-full bg-indigo-500 rounded-t transition-all duration-500" style={{ height: `${height}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Gradebook Tab ============ */

function GradebookTab() {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: fetchClasses });

  const { data: gradebook, isLoading } = useQuery({
    queryKey: ['admin-gradebook', selectedClass],
    queryFn: () => fetchGradebook(selectedClass ?? undefined),
  });

  const handleDownload = () => {
    const url = getGradebookExportUrl(selectedClass ?? undefined);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <select
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            value={selectedClass ?? ''}
            onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Semua Kelas</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={handleDownload} className={primaryBtnCls}>
          <FaDatabase aria-hidden="true" /> Download CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><FaSpinner className="animate-spin text-3xl text-indigo-500" /></div>
      ) : (
        <div className="space-y-6">
          {gradebook?.map((cls) => (
            <div key={cls.class_id} className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">{cls.class_name}</h3>
                  <p className="text-xs font-semibold text-slate-400">
                    {cls.students_count} siswa · Rata-rata: <span className="font-mono text-indigo-600">{cls.class_average ?? '—'}</span>
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3">Nama</th>
                      <th className="px-5 py-3 text-center">Ujian Dikerjakan</th>
                      <th className="px-5 py-3 text-center">Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cls.students.map((s) => (
                      <tr key={s.user_id} className="transition-colors hover:bg-indigo-50/40">
                        <td className="px-5 py-3 font-bold text-slate-800">{s.name}</td>
                        <td className="px-5 py-3 text-center font-mono text-sm font-bold text-slate-600">{s.exams_taken}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`font-mono text-sm font-bold ${
                            s.average_score != null && s.average_score >= 70 ? 'text-emerald-600' :
                            s.average_score != null && s.average_score >= 50 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {s.average_score != null ? s.average_score : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ Import/Export Tab ============ */

function ImportExportTab() {
  const queryClient = useQueryClient();
  const { data: exams } = useQuery({ queryKey: ['admin-exams'], queryFn: fetchAdminExams });
  const [importResult, setImportResult] = useState<{ type: string; data: { imported: number; skipped: number; errors: string[] } } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  const handleFileImport = async (type: 'students' | 'questions', file: File | null) => {
    if (!file) return;
    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      let result;
      if (type === 'students') {
        result = await importStudentsCsv(file);
      } else {
        if (!selectedExamId) {
          setError('Pilih ujian terlebih dahulu untuk import soal.');
          setImporting(false);
          return;
        }
        result = await importQuestionsCsv(file, selectedExamId);
      }
      setImportResult({ type, data: result });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal import data.');
    } finally {
      setImporting(false);
    }
  };

  const FileInput = ({ type, label }: { type: 'students' | 'questions'; label: string }) => {
    const fileRef = useState<null | { name: string; file: File }>(null);
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-700 mb-2">{label}</p>
        <input
          type="file"
          accept=".csv,.txt"
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-indigo-700"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileImport(type, f);
          }}
          disabled={importing}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-sm font-medium text-rose-700">
          <FaExclamationTriangle className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {importResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-800">Import {importResult.type === 'students' ? 'Siswa' : 'Soal'} Selesai</p>
          <p className="mt-1 text-sm text-emerald-700">
            {importResult.data.imported} berhasil diimport, {importResult.data.skipped} dilewati.
          </p>
          {importResult.data.errors.length > 0 && (
            <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-rose-600">
              {importResult.data.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Import Siswa */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">📥 Import Siswa (CSV)</h3>
        <p className="mt-1 text-sm text-slate-500">Upload file CSV dengan kolom: nama, email, password, kelas</p>
        <div className="mt-4 flex items-center gap-3">
          <a href={getTemplateUrl('students')} target="blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline">Download Template CSV</a>
        </div>
        <div className="mt-4">
          <FileInput type="students" label="Upload CSV Siswa" />
        </div>
      </div>

      {/* Import Soal */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">📝 Import Soal (CSV)</h3>
        <p className="mt-1 text-sm text-slate-500">Upload file CSV dengan kolom: tipe, soal, bobot, topik, kesulitan, opsi_a..e, jawaban</p>
        <div className="mt-4 flex items-center gap-4">
          <a href={getTemplateUrl('questions')} target="blank" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline">Download Template CSV</a>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"
            value={selectedExamId ?? ''}
            onChange={(e) => setSelectedExamId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Pilih Ujian</option>
            {exams?.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <FileInput type="questions" label="Upload CSV Soal" />
        </div>
      </div>

      {/* Export */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900">📤 Export Data</h3>
        <div className="mt-4 space-y-3">
          <a
            href={getExportUrl('students')}
            target="blank"
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:border-indigo-300 hover:bg-indigo-50"
          >
            <FaDatabase className="text-indigo-500" /> Export Semua Siswa (CSV)
          </a>
          {exams?.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="flex-1 text-sm font-bold text-slate-700">{e.title}</span>
              <a href={getExportUrl('questions', e.id)} target="blank" className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100">Export Soal</a>
              <a href={getExportUrl('results', e.id)} target="blank" className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100">Export Hasil</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============ Page shell ============ */

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [tab, setTab] = useState<Tab>('overview');
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    clearAuth();
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-[#fafbff] font-sans text-slate-900 antialiased">
      <div className="flex">
        {/* ===== Sidebar ===== */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-xl lg:flex">
          <Link to="/" className="flex items-center gap-2.5 px-6 py-5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30">
              <FaShieldAlt className="text-sm" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              CBT<span className="text-indigo-600"> Sekolah</span>
            </span>
          </Link>

          <nav className="mt-2 flex-1 space-y-1 px-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
                  tab === t.id
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25'
                    : 'text-slate-500 hover:bg-indigo-50/70 hover:text-indigo-700'
                }`}
              >
                <t.icon className="text-sm" aria-hidden="true" />
                {t.label}
                {t.id === 'blocked' && <span className="ml-auto text-[10px] opacity-80">lock</span>}
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md">
                {user?.name?.charAt(0) ?? 'A'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">Admin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
            >
              {theme === 'dark' ? '☀️' : '🌙'} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-all duration-300 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <FaSignOutAlt className="text-xs" aria-hidden="true" /> Keluar
            </button>
          </div>
        </aside>

        {/* ===== Main ===== */}
        <div className="min-w-0 flex-1">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between px-5 py-3.5">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
                  <FaShieldAlt className="text-sm" aria-hidden="true" />
                </span>
                <span className="text-base font-extrabold tracking-tight text-slate-900">Panel Admin</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Keluar"
              >
                <FaSignOutAlt aria-hidden="true" />
              </button>
            </div>
            {/* Mobile tabs */}
            <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                    tab === t.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600">
                  <FaDatabase className="text-xs" aria-hidden="true" /> Pusat Kontrol
                </Link>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Panel <span className="text-gradient">Admin</span>
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  Kelola pengguna, jadwal ujian, dan pantau jalannya ujian secara real-time.
                </p>
              </div>
              <span className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm sm:inline-flex">
                <FaCalendarAlt className="text-indigo-500" aria-hidden="true" />
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {tab === 'overview' && <Overview goTo={setTab} />}
            {tab === 'users' && <UsersTab />}
            {tab === 'subjects' && <SubjectsTab />}
            {tab === 'classes' && <ClassesTab />}
            {tab === 'exams' && <ExamsTab />}
            {tab === 'live' && <LiveMonitorTab />}
            {tab === 'blocked' && <BlockedTab />}
            {tab === 'analytics' && <AnalyticsTab />}
            {tab === 'gradebook' && <GradebookTab />}
            {tab === 'import' && <ImportExportTab />}
          </main>
        </div>
      </div>
    </div>
  );
}
