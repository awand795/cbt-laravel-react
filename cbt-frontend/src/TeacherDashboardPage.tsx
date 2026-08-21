import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaChalkboardTeacher,
  FaClipboardList,
  FaListOl,
  FaTrophy,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaBookOpen,
  FaCheck,
  FaEye,
  FaCalendarAlt,
  FaDatabase,
  FaPlay,
  FaPause,
  FaGraduationCap,
} from 'react-icons/fa';
import {
  addQuestionBankToExam,
  createQuestion,
  createQuestionBankItem,
  createTeacherExam,
  deleteQuestion,
  deleteQuestionBankItem,
  deleteTeacherExam,
  fetchQuestionBank,
  fetchQuestionBankList,
  fetchQuestionBankStats,
  fetchResults,
  fetchSessionDetail,
  fetchTeacherClasses,
  fetchTeacherExams,
  fetchTeacherSubjects,
  gradeEssayRequest,
  updateQuestion,
  updateQuestionBankItem,
  updateTeacherExam,
  type AdminExam,
  type GradedAnswer,
  type QuestionBankItem,
  type TeacherQuestion,
} from './api/client';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';

type Tab = 'overview' | 'exams' | 'questions' | 'results' | 'globalBank';

const TABS: { id: Tab; label: string; icon: typeof FaClipboardList }[] = [
  { id: 'overview', label: 'Ringkasan', icon: FaChalkboardTeacher },
  { id: 'exams', label: 'Ujian Saya', icon: FaClipboardList },
  { id: 'questions', label: 'Bank Soal', icon: FaListOl },
  { id: 'globalBank', label: 'Bank Global', icon: FaDatabase },
  { id: 'results', label: 'Hasil & Penilaian', icon: FaTrophy },
];

const EXAM_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draf', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
  published: { label: 'Terbit', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Ditutup', cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
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

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

const primaryBtnCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/40 disabled:cursor-not-allowed disabled:opacity-60';

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
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl shadow-black/20`}
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

/* ============ Overview ============ */

function Overview({ goTo }: { goTo: (t: Tab) => void }) {
  const { data: exams, isLoading } = useQuery({ queryKey: ['teacher-exams'], queryFn: fetchTeacherExams });

  const stats = useMemo(() => {
    const totalQuestions = exams?.reduce((acc, e) => acc + e.questions_count, 0) ?? 0;
    const totalSessions = exams?.reduce((acc, e) => acc + e.sessions_count, 0) ?? 0;
    const published = exams?.filter((e) => e.status === 'published').length ?? 0;
    return { exams: exams?.length ?? 0, totalQuestions, totalSessions, published };
  }, [exams]);

  const cards = [
    { label: 'Ujian Dibuat', value: stats.exams, icon: FaClipboardList, grad: 'from-indigo-500 to-violet-600' },
    { label: 'Total Soal', value: stats.totalQuestions, icon: FaListOl, grad: 'from-sky-500 to-cyan-600' },
    { label: 'Ujian Terbit', value: stats.published, icon: FaPlay, grad: 'from-emerald-500 to-teal-600' },
    { label: 'Peserta Total', value: stats.totalSessions, icon: FaGraduationCap, grad: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-100/60 to-violet-100/60 blur-2xl" />
            <div className="relative">
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

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">Ujian Saya</h3>
          <button
            type="button"
            onClick={() => goTo('exams')}
            className="text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700"
          >
            Kelola semua →
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {!exams || exams.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <FaBookOpen className="text-2xl text-indigo-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-slate-700">Belum ada ujian</p>
              <p className="mt-1 text-xs font-medium text-slate-400">Buat ujian pertama Anda, lalu isi bank soalnya.</p>
              <button type="button" onClick={() => goTo('exams')} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25">
                Buat Ujian
              </button>
            </div>
          ) : (
            exams.map((e) => {
              const st = EXAM_STATUS[e.status] ?? EXAM_STATUS.draft;
              return (
                <div key={e.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-indigo-50/40 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{e.title}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                      {e.subject ?? 'Umum'} · {e.questions_count} soal · {e.duration_minutes} menit
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge cls={st.cls} dot={st.dot}>{st.label}</Badge>
                    <button
                      type="button"
                      onClick={() => goTo('questions')}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                    >
                      Kelola Soal
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ Exams CRUD ============ */

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

  const { data: exams, isLoading } = useQuery({ queryKey: ['teacher-exams'], queryFn: fetchTeacherExams });
  const { data: subjects } = useQuery({ queryKey: ['teacher-subjects'], queryFn: fetchTeacherSubjects });
  const { data: classes } = useQuery({ queryKey: ['teacher-classes'], queryFn: fetchTeacherClasses });

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
      return editing ? updateTeacherExam(editing.id, payload) : createTeacherExam(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
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
    mutationFn: ({ id, status }: { id: number; status: 'draft' | 'published' | 'closed' }) => {
      const e = exams?.find((x) => x.id === id);
      if (!e) throw new Error('Ujian tidak ditemukan');
      return updateTeacherExam(id, {
        subject_id: e.subject_id,
        title: e.title,
        description: e.description ?? null,
        duration_minutes: e.duration_minutes,
        start_time: e.start_time ?? null,
        end_time: e.end_time ?? null,
        status,
        class_ids: e.class_ids,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-exams'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal mengubah status ujian.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacherExam,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teacher-exams'] }),
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
          <FaPlus aria-hidden="true" /> Buat Ujian
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
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
              ) : !exams || exams.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm font-medium text-slate-400">Belum ada ujian. Buat ujian pertama Anda!</td></tr>
              ) : (
                exams.map((e) => {
                  const st = EXAM_STATUS[e.status] ?? EXAM_STATUS.draft;
                  return (
                    <tr key={e.id} className="transition-colors hover:bg-indigo-50/40">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{e.title}</p>
                        <p className="text-xs font-medium text-slate-400">{e.questions_count} soal · {e.sessions_count} peserta</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {e.subject_code ? (
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">{e.subject_code}</span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">{e.subject ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-500">{e.duration_minutes} mnt</td>
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
          title={editing ? 'Edit Ujian' : 'Buat Ujian'}
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
              <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="cth: Ujian Tengah Semester Matematika" />
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
                  <p className="text-xs font-medium text-slate-400">Belum ada kelas. Minta admin membuat kelas terlebih dahulu.</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                {saveMutation.isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                {editing ? 'Simpan Perubahan' : 'Buat Ujian'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============ Question bank ============ */

interface QuestionForm {
  type: 'pg' | 'essay';
  question_text: string;
  media_url: string;
  score: string;
  options: { option_text: string; is_correct: boolean }[];
}

function QuestionsTab() {
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TeacherQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionForm>({
    type: 'pg',
    question_text: '',
    media_url: '',
    score: '1',
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
  });

  const { data: exams } = useQuery({ queryKey: ['teacher-exams'], queryFn: fetchTeacherExams });
  const activeExamId = examId ?? exams?.[0]?.id ?? null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['question-bank', activeExamId],
    queryFn: () => fetchQuestionBank(activeExamId!),
    enabled: activeExamId != null,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        question_text: form.question_text,
        media_url: form.media_url || null,
        score: Math.max(1, Number(form.score) || 1),
        options: form.type === 'pg' ? form.options.filter((o) => o.option_text.trim() !== '') : undefined,
      };
      return editing
        ? updateQuestion(activeExamId!, editing.id, payload)
        : createQuestion(activeExamId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', activeExamId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
      setCreating(false);
      setEditing(null);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan soal.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ questionId }: { questionId: number }) => deleteQuestion(activeExamId!, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', activeExamId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menghapus soal.');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      type: 'pg',
      question_text: '',
      media_url: '',
      score: '1',
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ],
    });
    setError(null);
    setCreating(true);
  };

  const openEdit = (q: TeacherQuestion) => {
    setCreating(true);
    setEditing(q);
    setForm({
      type: q.type,
      question_text: q.question_text,
      media_url: q.media_url ?? '',
      score: String(q.score ?? 1),
      options: q.type === 'pg'
        ? q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct }))
        : [{ option_text: '', is_correct: false }],
    });
    setError(null);
  };

  const hasCorrectOption = form.options.some((o) => o.is_correct && o.option_text.trim() !== '');
  const validPg = form.type === 'essay' || (form.options.filter((o) => o.option_text.trim() !== '').length >= 2 && hasCorrectOption);

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <select
          className={`${inputCls} max-w-sm`}
          value={activeExamId ?? ''}
          onChange={(e) => setExamId(Number(e.target.value))}
        >
          {!exams || exams.length === 0 ? (
            <option value="">Belum ada ujian — buat dulu di tab Ujian</option>
          ) : (
            exams.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))
          )}
        </select>
        <button type="button" className={primaryBtnCls} onClick={openCreate} disabled={activeExamId == null}>
          <FaPlus aria-hidden="true" /> Tambah Soal
        </button>
      </div>

      {isError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          Gagal memuat bank soal.{' '}
          <button type="button" onClick={() => refetch()} className="font-bold underline">Coba lagi</button>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <FaSpinner className="animate-spin text-2xl text-indigo-500" aria-hidden="true" />
          </div>
        ) : !data || data.questions.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
            <FaListOl className="text-2xl text-indigo-300" aria-hidden="true" />
            <h3 className="mt-4 text-base font-bold text-slate-800">Bank soal masih kosong</h3>
            <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">
              Tambahkan soal pilihan ganda atau essay untuk ujian ini.
            </p>
            <button type="button" onClick={openCreate} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5">
              Tambah Soal Pertama
            </button>
          </div>
        ) : (
          data.questions.map((q, idx) => (
            <div
              key={q.id}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 font-mono text-sm font-bold text-white shadow-md">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        cls={q.type === 'pg' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-violet-50 text-violet-700 ring-violet-200'}
                      >
                        {q.type === 'pg' ? 'Pilihan Ganda' : 'Essay'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-400">{q.options.length} opsi</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-100">
                        {q.score ?? 1} poin
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-slate-800">{q.question_text}</p>
                    {q.type === 'pg' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {q.options.map((o, i) => (
                          <span
                            key={o.id}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                              o.is_correct
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-50 text-slate-500 ring-1 ring-slate-100'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {o.option_text}
                            {o.is_correct && <FaCheck className="text-[10px]" aria-hidden="true" />}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                    aria-label={`Edit soal ${idx + 1}`}
                  >
                    <FaEdit className="text-xs" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Hapus soal ini?')) deleteMutation.mutate({ questionId: q.id });
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Hapus soal ${idx + 1}`}
                  >
                    <FaTrash className="text-xs" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <Modal
          title={editing ? 'Edit Soal' : 'Tambah Soal'}
          subtitle={activeExamId ? `Untuk ujian: ${exams?.find((e) => e.id === activeExamId)?.title ?? ''}` : undefined}
          onClose={() => setCreating(false)}
          wide
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!validPg) {
                setError('Soal PG wajib memiliki minimal 2 opsi dan satu jawaban benar.');
                return;
              }
              saveMutation.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              {(['pg', 'essay'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, type: t, options: t === 'pg' ? [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }, { option_text: '', is_correct: false }] : form.options })}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-200 ${
                    form.type === t
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {t === 'pg' ? 'Pilihan Ganda' : 'Essay'}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Pertanyaan</label>
              <textarea
                className={inputCls}
                rows={3}
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                required
                placeholder="Tulis soal di sini…"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Bobot Nilai <span className="font-normal text-slate-400">(poin — skor akhir dihitung dari bobot)</span>
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                className={`${inputCls} max-w-[160px]`}
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                required
              />
            </div>

            {form.type === 'pg' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Opsi Jawaban <span className="font-normal text-slate-400">(centang kunci jawaban)</span>
                </label>
                <div className="space-y-2.5">
                  {form.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          options: form.options.map((x, xi) => ({ ...x, is_correct: xi === i })),
                        })}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                          o.is_correct
                            ? 'border-emerald-400 bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-emerald-300'
                        }`}
                        aria-label={`Tandai opsi ${String.fromCharCode(65 + i)} sebagai kunci jawaban`}
                        title="Kunci jawaban"
                      >
                        {o.is_correct ? <FaCheck aria-hidden="true" /> : String.fromCharCode(65 + i)}
                      </button>
                      <input
                        className={inputCls}
                        value={o.option_text}
                        onChange={(e) => {
                          const next = [...form.options];
                          next[i] = { ...next[i], option_text: e.target.value };
                          setForm({ ...form, options: next });
                        }}
                        placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                      />
                      {form.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, options: form.options.filter((_, xi) => xi !== i) })}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          aria-label={`Hapus opsi ${String.fromCharCode(65 + i)}`}
                        >
                          <FaTrash className="text-xs" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.options.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, options: [...form.options, { option_text: '', is_correct: false }] })}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                  >
                    <FaPlus className="text-[10px]" aria-hidden="true" /> Tambah Opsi
                  </button>
                )}
                {form.options.filter((o) => o.option_text.trim() !== '').length >= 2 && !hasCorrectOption && (
                  <p className="mt-2 text-xs font-semibold text-rose-500">Pilih satu kunci jawaban yang benar.</p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">URL Media (opsional)</label>
              <input className={inputCls} value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder="https://… gambar pendukung soal" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCreating(false)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                {saveMutation.isPending ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                {editing ? 'Simpan Perubahan' : 'Tambah Soal'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============ Results & grading ============ */

function ResultsTab() {
  const queryClient = useQueryClient();
  const [examId, setExamId] = useState<number | null>(null);
  const [detailSession, setDetailSession] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: exams } = useQuery({ queryKey: ['teacher-exams'], queryFn: fetchTeacherExams });
  const activeExamId = examId ?? exams?.[0]?.id ?? null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['results', activeExamId],
    queryFn: () => fetchResults(activeExamId!),
    enabled: activeExamId != null,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['session-detail', detailSession],
    queryFn: () => fetchSessionDetail(detailSession!),
    enabled: detailSession != null,
  });

  const gradeMutation = useMutation({
    mutationFn: ({ questionId, isCorrect }: { questionId: number; isCorrect: boolean }) =>
      gradeEssayRequest(detailSession!, questionId, isCorrect),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-detail', detailSession] });
      queryClient.invalidateQueries({ queryKey: ['results', activeExamId] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan penilaian.');
    },
  });

  const essayGradedCount = (detail?.questions ?? []).filter(
    (q) => q.type === 'essay' && q.is_correct != null,
  ).length;

  return (
    <div className="space-y-5">
      {error && <AlertBanner message={error} />}

      <select
        className={`${inputCls} max-w-sm`}
        value={activeExamId ?? ''}
        onChange={(e) => setExamId(Number(e.target.value))}
      >
        {!exams || exams.length === 0 ? (
          <option value="">Belum ada ujian</option>
        ) : (
          exams.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))
        )}
      </select>

      {isError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          Gagal memuat hasil.{' '}
          <button type="button" onClick={() => refetch()} className="font-bold underline">Coba lagi</button>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Siswa</th>
                <th className="px-5 py-3.5">Skor PG</th>
                <th className="px-5 py-3.5">Essay</th>
                <th className="px-5 py-3.5">Selesai</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center"><FaSpinner className="mx-auto animate-spin text-indigo-500" aria-hidden="true" /></td></tr>
              ) : !data || data.results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <FaTrophy className="mx-auto text-2xl text-indigo-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-bold text-slate-700">Belum ada siswa yang menyelesaikan ujian ini.</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">Hasil akan muncul otomatis setelah peserta mengumpulkan ujian.</p>
                  </td>
                </tr>
              ) : (
                data.results.map((r) => (
                  <tr key={r.session_id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800">{r.user_name ?? '—'}</p>
                      <p className="text-xs font-medium text-slate-400">{r.user_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-baseline gap-1 font-mono text-base font-bold tabular-nums ${r.score != null && r.score >= 75 ? 'text-emerald-600' : r.score != null && r.score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {r.score != null ? <>{r.score}<span className="text-xs text-slate-400">/100</span></> : <span className="text-slate-300">—</span>}
                      </span>
                      <p className="text-[11px] font-medium text-slate-400">
                        {r.pg_correct_weight} poin benar dari {r.pg_total_weight} poin PG
                      </p>
                      {r.final_score != null && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                          Nilai akhir: {r.final_score}/100
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.essay_answered > 0 ? (
                        <Badge cls={r.essay_graded >= r.essay_answered ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>
                          {r.essay_graded}/{r.essay_answered} dinilai
                        </Badge>
                      ) : (
                        <span className="text-xs font-medium text-slate-300">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{formatDate(r.finished_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setDetailSession(r.session_id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <FaEye aria-hidden="true" /> Periksa Jawaban
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

      {/* ===== Grading detail modal ===== */}
      {detailSession != null && (
        <Modal
          title="Periksa Jawaban Siswa"
          subtitle={detail ? `${detail.session.user_name ?? 'Siswa'} · ${detail.session.exam_title}` : undefined}
          onClose={() => setDetailSession(null)}
          wide
        >
          {detailLoading || !detail ? (
            <div className="flex justify-center py-16">
              <FaSpinner className="animate-spin text-2xl text-indigo-500" aria-hidden="true" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                <span>{detail.session.user_email}</span>
                <span className="text-slate-300">·</span>
                <span>Mulai: {formatDate(detail.session.started_at)}</span>
                <span className="text-slate-300">·</span>
                <span>Selesai: {formatDate(detail.session.finished_at)}</span>
                {detail.session.cheat_count > 0 && (
                  <span className="font-bold text-rose-500">{detail.session.cheat_count}× pelanggaran</span>
                )}
              </div>

              {essayGradedCount > 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  <FaCheckCircle aria-hidden="true" />
                  {essayGradedCount} jawaban essay sudah dinilai. Hasil tersimpan otomatis.
                </div>
              )}

              <div className="space-y-4">
                {detail.questions.map((q, idx) => (
                  <EssayQuestion key={q.question_id} q={q} index={idx} onGrade={(isCorrect) => gradeMutation.mutate({ questionId: q.question_id, isCorrect })} grading={gradeMutation.isPending} />
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function EssayQuestion({
  q,
  index,
  onGrade,
  grading,
}: {
  q: GradedAnswer;
  index: number;
  onGrade: (isCorrect: boolean) => void;
  grading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 font-mono text-xs font-bold text-white">
            {index + 1}
          </span>
          <div>
            <Badge cls={q.type === 'pg' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-violet-50 text-violet-700 ring-violet-200'}>
              {q.type === 'pg' ? 'Pilihan Ganda' : 'Essay'}
            </Badge>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-100">
              {q.score ?? 1} poin
            </span>
            <p className="mt-2 text-sm font-bold leading-relaxed text-slate-800">{q.question_text}</p>
          </div>
        </div>
        {q.type === 'pg' && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            q.is_correct === true
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : q.is_correct === false
                ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                : 'bg-slate-100 text-slate-400'
          }`}>
            {q.is_correct === true ? 'Benar' : q.is_correct === false ? 'Salah' : 'Tidak dijawab'}
          </span>
        )}
      </div>

      {q.type === 'pg' ? (
        <div className="mt-4 space-y-2">
          {q.options.map((o, i) => {
            const chosen = q.answer_option_id === o.id;
            return (
              <div
                key={o.id}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
                  chosen
                    ? o.is_correct
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-rose-300 bg-rose-50 text-rose-700'
                    : o.is_correct
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 font-medium">{o.option_text}</span>
                {chosen && <span className="text-[10px] font-bold uppercase">Jawaban siswa</span>}
                {o.is_correct && <FaCheck className="text-emerald-500" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          {q.answer_essay_text ? (
            <>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100">
                {q.answer_essay_text}
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-400">Penilaian:</span>
                <button
                  type="button"
                  disabled={grading}
                  onClick={() => onGrade(true)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    q.is_correct === true
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                  }`}
                >
                  <FaCheck aria-hidden="true" /> Benar
                </button>
                <button
                  type="button"
                  disabled={grading}
                  onClick={() => onGrade(false)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    q.is_correct === false
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                      : 'border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:text-rose-600'
                  }`}
                >
                  <FaTimes aria-hidden="true" /> Salah
                </button>
                {q.is_correct == null && (
                  <span className="text-[11px] font-semibold text-amber-600">Belum dinilai</span>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400 ring-1 ring-slate-100">
              Siswa tidak menjawab soal ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============ Global Question Bank Tab ============ */

function GlobalBankTab() {
  const queryClient = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QuestionBankItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject_id: '',
    type: 'pg' as 'pg' | 'essay',
    question_text: '',
    media_url: '',
    score: '1',
    topic: '',
    difficulty: 'medium',
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
  });
  const [addToExamModal, setAddToExamModal] = useState<number | null>(null);

  const { data: subjects } = useQuery({ queryKey: ['teacher-subjects'], queryFn: fetchTeacherSubjects });
  const { data: exams } = useQuery({ queryKey: ['teacher-exams'], queryFn: fetchTeacherExams });
  const { data: bankData, isLoading } = useQuery({
    queryKey: ['question-bank', subjectFilter, typeFilter, search],
    queryFn: () => fetchQuestionBankList({
      subject_id: subjectFilter ?? undefined,
      type: typeFilter || undefined,
      search: search || undefined,
    }),
  });
  const { data: stats } = useQuery({ queryKey: ['question-bank-stats'], queryFn: fetchQuestionBankStats });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        subject_id: Number(form.subject_id),
        type: form.type,
        question_text: form.question_text,
        media_url: form.media_url || null,
        score: Number(form.score) || 1,
        topic: form.topic || null,
        difficulty: form.difficulty,
        options: form.type === 'pg' ? form.options.filter((o) => o.option_text.trim()) : undefined,
      };
      return editing ? updateQuestionBankItem(editing.id, payload) : createQuestionBankItem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
      setCreating(false);
      setEditing(null);
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Gagal menyimpan soal.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuestionBankItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['question-bank'] }),
  });

  const addToExamMutation = useMutation({
    mutationFn: ({ bankId, examId }: { bankId: number; examId: number }) => addQuestionBankToExam(bankId, examId),
    onSuccess: () => {
      setAddToExamModal(null);
      alert('Soal berhasil ditambahkan ke ujian!');
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      subject_id: subjects?.[0] ? String(subjects[0].id) : '',
      type: 'pg', question_text: '', media_url: '', score: '1', topic: '', difficulty: 'medium',
      options: [
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
      ],
    });
    setError(null);
    setCreating(true);
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700">{error}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-slate-400">Total Soal</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          {Object.entries(stats.by_type).map(([type, count]) => (
            <div key={type} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">{type === 'pg' ? 'Pilihan Ganda' : 'Essay'}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{count}</p>
            </div>
          ))}
          {Object.entries(stats.by_difficulty).map(([diff, count]) => (
            <div key={diff} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-400">{diff}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Create */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-indigo-400"
            placeholder="Cari soal…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none" value={subjectFilter ?? ''} onChange={(e) => setSubjectFilter(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Semua Mapel</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Semua Tipe</option>
            <option value="pg">PG</option>
            <option value="essay">Essay</option>
          </select>
        </div>
        <button type="button" onClick={openCreate} className={primaryBtnCls}><FaPlus /> Tambah Soal</button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10"><FaSpinner className="animate-spin text-3xl text-indigo-500" /></div>
      ) : (
        <div className="space-y-3">
          {bankData?.data?.map((q) => (
            <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 ring-1 ring-indigo-100">{q.type.toUpperCase()}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">{q.difficulty}</span>
                    {q.topic && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">{q.topic}</span>}
                    <span className="text-[10px] font-bold text-slate-400">Bobot: {q.score}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 line-clamp-2">{q.question_text}</p>
                  {q.type === 'pg' && q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.options.map((o) => (
                        <span key={o.id} className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${o.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{o.option_text}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 outline-none"
                    value={addToExamModal === q.id ? '' : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        addToExamMutation.mutate({ bankId: q.id, examId: Number(e.target.value) });
                      }
                    }}
                  >
                    <option value="">+ Ke Ujian</option>
                    {exams?.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                  </select>
                  <button type="button" onClick={() => {
                    setEditing(q);
                    setForm({
                      subject_id: String(q.subject_id), type: q.type, question_text: q.question_text,
                      media_url: q.media_url ?? '', score: String(q.score), topic: q.topic ?? '', difficulty: q.difficulty,
                      options: q.options.length >= 2 ? q.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })) : [
                        { option_text: '', is_correct: false }, { option_text: '', is_correct: false },
                        { option_text: '', is_correct: false }, { option_text: '', is_correct: false },
                      ],
                    });
                    setCreating(true);
                  }} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"><FaEdit /></button>
                  <button type="button" onClick={() => { if (window.confirm('Hapus soal ini?')) deleteMutation.mutate(q.id); }} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"><FaTrash /></button>
                </div>
              </div>
            </div>
          ))}
          {bankData?.data?.length === 0 && (
            <p className="py-10 text-center text-sm font-medium text-slate-400">Belum ada soal di bank global.</p>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-extrabold text-slate-900">{editing ? 'Edit Soal Bank' : 'Tambah Soal Bank'}</h3>
              <button type="button" onClick={() => setCreating(false)} className="text-slate-400 hover:text-rose-500"><FaTimes /></button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Mapel</label>
                <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
                  <option value="">Pilih Mapel</option>
                  {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Tipe</label>
                  <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'pg' | 'essay' })}>
                    <option value="pg">PG</option>
                    <option value="essay">Essay</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Bobot</label>
                  <input type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} min={1} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Kesulitan</label>
                  <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    <option value="easy">Mudah</option>
                    <option value="medium">Sedang</option>
                    <option value="hard">Sulit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Topik (opsional)</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="cth: Bab 1 - Penjumlahan" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Soal</label>
                <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold" rows={3} value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} required />
              </div>
              {form.type === 'pg' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Opsi Jawaban</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={opt.is_correct} onChange={() => {
                        const newOpts = form.options.map((o, j) => ({ ...o, is_correct: j === i }));
                        setForm({ ...form, options: newOpts });
                      }} className="accent-emerald-500" title="Jawaban benar" />
                      <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={opt.option_text} onChange={(e) => {
                        const newOpts = [...form.options];
                        newOpts[i] = { ...newOpts[i], option_text: e.target.value };
                        setForm({ ...form, options: newOpts });
                      }} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCreating(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600">Batal</button>
                <button type="submit" disabled={saveMutation.isPending} className={primaryBtnCls}>
                  {saveMutation.isPending ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                  {editing ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Page shell ============ */

export default function TeacherDashboardPage() {
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
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md">
                {user?.name?.charAt(0) ?? 'G'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{user?.name}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Guru</p>
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
                <span className="text-base font-extrabold tracking-tight text-slate-900">Panel Guru</span>
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
                  <FaDatabase className="text-xs" aria-hidden="true" /> Ruang Kerja
                </Link>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Panel <span className="text-gradient">Guru</span>
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  Kelola ujian, susun bank soal, dan periksa hasil siswa.
                </p>
              </div>
              <span className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm sm:inline-flex">
                <FaCalendarAlt className="text-indigo-500" aria-hidden="true" />
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {tab === 'overview' && <Overview goTo={setTab} />}
            {tab === 'exams' && <ExamsTab />}
            {tab === 'questions' && <QuestionsTab />}
            {tab === 'globalBank' && <GlobalBankTab />}
            {tab === 'results' && <ResultsTab />}
          </main>
        </div>
      </div>
    </div>
  );
}
