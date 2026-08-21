import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Sematkan token dari Zustand store ke setiap request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Jika token tidak valid/kedaluwarsa (401), bersihkan sesi lokal
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: AuthUser;
  } | null;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/login', { email, password });
  return data;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/logout');
}

export interface ExamSessionInfo {
  id: number;
  status: 'ongoing' | 'finished' | 'blocked';
  started_at: string | null;
  finished_at: string | null;
  cheat_count: number;
}

export interface StudentExam {
  id: number;
  title: string;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  subject: string | null;
  questions_count: number;
  session: ExamSessionInfo | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface StartExamData {
  session_id: number;
  exam_id: number;
  title: string;
  duration_minutes: number;
  started_at: string | null;
  questions_count: number;
  status: string;
}

export async function fetchStudentExams(): Promise<StudentExam[]> {
  const { data } = await api.get<ApiResponse<StudentExam[]>>('/student/exams');
  return data.data;
}

export async function startExamRequest(examId: number): Promise<StartExamData> {
  const { data } = await api.post<ApiResponse<StartExamData>>(`/student/exams/${examId}/start`);
  return data.data;
}

export interface ExamOption {
  id: number;
  option_text: string;
}

export interface ExamQuestion {
  id: number;
  type: 'pg' | 'essay';
  question_text: string;
  media_url: string | null;
  options: ExamOption[];
  saved_option_id: number | null;
  saved_essay_text: string | null;
}

export interface ExamSessionDetail {
  session_id: number;
  exam_id: number;
  title: string;
  duration_minutes: number;
  remaining_seconds: number;
  questions: ExamQuestion[];
}

export interface SaveAnswerData {
  question_id: number;
  option_id: number | null;
  essay_text: string | null;
  is_correct: boolean | null;
}

export interface SubmitExamData {
  session_id: number;
  finished_at: string | null;
  score: number | null;
  pg_correct: number;
  pg_total: number;
  pg_correct_weight?: number;
  pg_total_weight?: number;
}

export async function fetchExamSession(sessionId: number): Promise<ExamSessionDetail> {
  const { data } = await api.get<ApiResponse<ExamSessionDetail>>(`/student/exam-sessions/${sessionId}`);
  return data.data;
}

export async function saveAnswerRequest(
  sessionId: number,
  payload: { question_id: number; option_id?: number | null; essay_text?: string | null },
): Promise<SaveAnswerData> {
  const { data } = await api.post<ApiResponse<SaveAnswerData>>(
    `/student/exam-sessions/${sessionId}/answer`,
    payload,
  );
  return data.data;
}

export async function submitExamRequest(sessionId: number): Promise<SubmitExamData> {
  const { data } = await api.post<ApiResponse<SubmitExamData>>(`/student/exam-sessions/${sessionId}/submit`);
  return data.data;
}

export async function blockExamRequest(sessionId: number): Promise<void> {
  await api.post(`/student/exam-sessions/${sessionId}/block`);
}

/* ============================================================
   Shared admin/teacher types
   ============================================================ */

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  class_id: number | null;
  class_name: string | null;
  created_at: string | null;
}

export interface ClassroomRecord {
  id: number;
  name: string;
  code: string | null;
  students_count?: number;
}

export interface SubjectRecord {
  id: number;
  name: string;
  code: string | null;
  exams_count?: number;
}

export interface AdminExam {
  id: number;
  subject_id: number;
  subject: string | null;
  subject_code: string | null;
  created_by: number | null;
  creator: string | null;
  title: string;
  description: string | null;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
  status: 'draft' | 'published' | 'closed';
  class_ids: number[];
  class_names: string[];
  questions_count: number;
  sessions_count: number;
}

export interface SessionRecord {
  id: number;
  exam_id: number;
  exam_title?: string | null;
  user_id: number;
  user_name: string | null;
  user_email?: string | null;
  status: 'ongoing' | 'finished' | 'blocked';
  cheat_count: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface AdminStats {
  students: number;
  teachers: number;
  admins: number;
  classes: number;
  subjects: number;
  exams: number;
  published_exams: number;
  sessions: {
    ongoing: number;
    finished: number;
    blocked: number;
  };
  recent_sessions: SessionRecord[];
}

export interface LiveMonitorData {
  exam: AdminExam;
  sessions: SessionRecord[];
}

/* ============================================================
   Admin API
   ============================================================ */

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<ApiResponse<AdminStats>>('/admin/stats');
  return data.data;
}

export async function fetchUsers(role?: string): Promise<UserRecord[]> {
  const { data } = await api.get<ApiResponse<UserRecord[]>>('/admin/users', {
    params: role ? { role } : undefined,
  });
  return data.data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  class_id?: number | null;
}): Promise<UserRecord> {
  const { data } = await api.post<ApiResponse<UserRecord>>('/admin/users', payload);
  return data.data;
}

export async function updateUser(
  id: number,
  payload: { name: string; email: string; password?: string; role: 'admin' | 'teacher' | 'student'; class_id?: number | null },
): Promise<UserRecord> {
  const { data } = await api.put<ApiResponse<UserRecord>>(`/admin/users/${id}`, payload);
  return data.data;
}

export async function fetchClasses(): Promise<ClassroomRecord[]> {
  const { data } = await api.get<ApiResponse<ClassroomRecord[]>>('/admin/classes');
  return data.data;
}

export async function createClass(payload: { name: string; code?: string }): Promise<ClassroomRecord> {
  const { data } = await api.post<ApiResponse<ClassroomRecord>>('/admin/classes', payload);
  return data.data;
}

export async function updateClass(id: number, payload: { name: string; code?: string }): Promise<ClassroomRecord> {
  const { data } = await api.put<ApiResponse<ClassroomRecord>>(`/admin/classes/${id}`, payload);
  return data.data;
}

export async function deleteClass(id: number): Promise<void> {
  await api.delete(`/admin/classes/${id}`);
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

export async function fetchSubjects(): Promise<SubjectRecord[]> {
  const { data } = await api.get<ApiResponse<SubjectRecord[]>>('/admin/subjects');
  return data.data;
}

export async function createSubject(payload: { name: string; code?: string }): Promise<SubjectRecord> {
  const { data } = await api.post<ApiResponse<SubjectRecord>>('/admin/subjects', payload);
  return data.data;
}

export async function updateSubject(id: number, payload: { name: string; code?: string }): Promise<SubjectRecord> {
  const { data } = await api.put<ApiResponse<SubjectRecord>>(`/admin/subjects/${id}`, payload);
  return data.data;
}

export async function deleteSubject(id: number): Promise<void> {
  await api.delete(`/admin/subjects/${id}`);
}

export async function fetchAdminExams(): Promise<AdminExam[]> {
  const { data } = await api.get<ApiResponse<AdminExam[]>>('/admin/exams');
  return data.data;
}

export async function createExam(payload: ExamPayload): Promise<AdminExam> {
  const { data } = await api.post<ApiResponse<AdminExam>>('/admin/exams', payload);
  return data.data;
}

export async function updateExam(id: number, payload: ExamPayload): Promise<AdminExam> {
  const { data } = await api.put<ApiResponse<AdminExam>>(`/admin/exams/${id}`, payload);
  return data.data;
}

export async function updateExamStatus(id: number, status: 'draft' | 'published' | 'closed'): Promise<AdminExam> {
  const { data } = await api.patch<ApiResponse<AdminExam>>(`/admin/exams/${id}/status`, { status });
  return data.data;
}

export async function deleteExam(id: number): Promise<void> {
  await api.delete(`/admin/exams/${id}`);
}

export async function fetchLiveMonitor(examId: number): Promise<LiveMonitorData> {
  const { data } = await api.get<ApiResponse<LiveMonitorData>>(`/admin/exams/${examId}/live-monitor`);
  return data.data;
}

export async function fetchBlockedSessions(): Promise<SessionRecord[]> {
  const { data } = await api.get<ApiResponse<SessionRecord[]>>('/admin/blocked-sessions');
  return data.data;
}

export async function unblockSession(sessionId: number): Promise<SessionRecord> {
  const { data } = await api.post<ApiResponse<SessionRecord>>(`/admin/exam-sessions/${sessionId}/unblock`);
  return data.data;
}

export interface ExamPayload {
  subject_id: number;
  title: string;
  description?: string | null;
  duration_minutes: number;
  start_time?: string | null;
  end_time?: string | null;
  status?: 'draft' | 'published' | 'closed';
  class_ids?: number[];
}

/* ============================================================
   Teacher API
   ============================================================ */

export async function fetchTeacherSubjects(): Promise<SubjectRecord[]> {
  const { data } = await api.get<ApiResponse<SubjectRecord[]>>('/teacher/subjects');
  return data.data;
}

export async function fetchTeacherClasses(): Promise<ClassroomRecord[]> {
  const { data } = await api.get<ApiResponse<ClassroomRecord[]>>('/teacher/classes');
  return data.data;
}

export async function fetchTeacherExams(): Promise<AdminExam[]> {
  const { data } = await api.get<ApiResponse<AdminExam[]>>('/teacher/exams');
  return data.data;
}

export async function createTeacherExam(payload: ExamPayload): Promise<AdminExam> {
  const { data } = await api.post<ApiResponse<AdminExam>>('/teacher/exams', payload);
  return data.data;
}

export async function updateTeacherExam(id: number, payload: ExamPayload): Promise<AdminExam> {
  const { data } = await api.put<ApiResponse<AdminExam>>(`/teacher/exams/${id}`, payload);
  return data.data;
}

export async function deleteTeacherExam(id: number): Promise<void> {
  await api.delete(`/teacher/exams/${id}`);
}

export interface TeacherQuestion {
  id: number;
  type: 'pg' | 'essay';
  question_text: string;
  media_url: string | null;
  score: number;
  options: { id: number; option_text: string; is_correct: boolean }[];
}

export interface QuestionBankData {
  exam: AdminExam;
  questions: TeacherQuestion[];
}

export async function fetchQuestionBank(examId: number): Promise<QuestionBankData> {
  const { data } = await api.get<ApiResponse<QuestionBankData>>(`/teacher/exams/${examId}/questions`);
  return data.data;
}

export interface QuestionPayload {
  type: 'pg' | 'essay';
  question_text: string;
  media_url?: string | null;
  score?: number;
  options?: { option_text: string; is_correct: boolean }[];
}

export async function createQuestion(examId: number, payload: QuestionPayload): Promise<TeacherQuestion> {
  const { data } = await api.post<ApiResponse<TeacherQuestion>>(`/teacher/exams/${examId}/questions`, payload);
  return data.data;
}

export async function updateQuestion(
  examId: number,
  questionId: number,
  payload: QuestionPayload,
): Promise<TeacherQuestion> {
  const { data } = await api.put<ApiResponse<TeacherQuestion>>(
    `/teacher/exams/${examId}/questions/${questionId}`,
    payload,
  );
  return data.data;
}

export async function deleteQuestion(examId: number, questionId: number): Promise<void> {
  await api.delete(`/teacher/exams/${examId}/questions/${questionId}`);
}

export interface ResultRecord {
  session_id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  status: 'ongoing' | 'finished' | 'blocked';
  cheat_count: number;
  started_at: string | null;
  finished_at: string | null;
  score: number | null;
  final_score: number | null;
  pg_correct: number;
  pg_total: number;
  pg_correct_weight: number;
  pg_total_weight: number;
  essay_answered: number;
  essay_graded: number;
}

export interface ResultsData {
  exam: AdminExam;
  results: ResultRecord[];
}

export async function fetchResults(examId: number): Promise<ResultsData> {
  const { data } = await api.get<ApiResponse<ResultsData>>(`/teacher/exams/${examId}/results`);
  return data.data;
}

export interface GradedAnswer {
  question_id: number;
  type: 'pg' | 'essay';
  question_text: string;
  score: number;
  options: { id: number; option_text: string; is_correct: boolean }[];
  answer_option_id: number | null;
  answer_essay_text: string | null;
  is_correct: boolean | null;
}

export interface SessionDetailData {
  session: {
    id: number;
    user_name: string | null;
    user_email: string | null;
    exam_title: string;
    started_at: string | null;
    finished_at: string | null;
    cheat_count: number;
  };
  questions: GradedAnswer[];
}

export async function fetchSessionDetail(sessionId: number): Promise<SessionDetailData> {
  const { data } = await api.get<ApiResponse<SessionDetailData>>(`/teacher/exam-sessions/${sessionId}`);
  return data.data;
}

export async function gradeEssayRequest(
  sessionId: number,
  questionId: number,
  isCorrect: boolean,
): Promise<{ is_correct: boolean }> {
  const { data } = await api.post<ApiResponse<{ is_correct: boolean }>>(
    `/teacher/exam-sessions/${sessionId}/grade/${questionId}`,
    { is_correct: isCorrect },
  );
  return data.data;
}

/* ============================================================
   Student Profile & Exam History
   ============================================================ */

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  class_id: number | null;
  class_name: string | null;
  created_at: string | null;
}

export interface ExamHistorySummary {
  total_exams: number;
  average_score: number | null;
  best_score: number | null;
  total_cheats: number;
}

export interface ExamHistoryItem {
  session_id: number;
  exam_id: number;
  exam_title: string;
  subject: string | null;
  duration_minutes: number;
  score: number | null;
  pg_correct: number;
  pg_total: number;
  essay_answered: number;
  essay_graded: number;
  total_questions: number;
  cheat_count: number;
  started_at: string | null;
  finished_at: string | null;
  duration_taken: number | null;
}

export interface ExamHistoryData {
  summary: ExamHistorySummary;
  history: ExamHistoryItem[];
}

export async function fetchStudentProfile(): Promise<StudentProfile> {
  const { data } = await api.get<ApiResponse<StudentProfile>>('/student/profile');
  return data.data;
}

export async function updateStudentProfile(payload: {
  name?: string;
  email?: string;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}): Promise<StudentProfile> {
  const { data } = await api.put<ApiResponse<StudentProfile>>('/student/profile', payload);
  return data.data;
}

export async function fetchExamHistory(): Promise<ExamHistoryData> {
  const { data } = await api.get<ApiResponse<ExamHistoryData>>('/student/exam-history');
  return data.data;
}

export async function fetchExamHistoryDetail(sessionId: number): Promise<unknown> {
  const { data } = await api.get<ApiResponse<unknown>>(`/student/exam-history/${sessionId}`);
  return data.data;
}

/* ============================================================
   Question Bank (Reusable)
   ============================================================ */

export interface QuestionBankItem {
  id: number;
  subject_id: number;
  subject: string | null;
  type: 'pg' | 'essay';
  question_text: string;
  media_url: string | null;
  score: number;
  topic: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  options: { id: number; option_text: string; is_correct: boolean }[];
  options_count: number;
}

export interface QuestionBankStats {
  total: number;
  by_subject: Record<string, number>;
  by_type: Record<string, number>;
  by_difficulty: Record<string, number>;
  topics: { topic: string; count: number }[];
}

export interface QuestionBankPayload {
  subject_id: number;
  type: 'pg' | 'essay';
  question_text: string;
  media_url?: string | null;
  score?: number;
  topic?: string | null;
  difficulty?: string;
  options?: { option_text: string; is_correct: boolean }[];
}

export async function fetchQuestionBankList(params?: {
  subject_id?: number;
  type?: string;
  difficulty?: string;
  search?: string;
  page?: number;
}): Promise<{ data: QuestionBankItem[]; current_page: number; last_page: number; total: number }> {
  const { data } = await api.get<ApiResponse<{ data: QuestionBankItem[]; current_page: number; last_page: number; total: number }>>(
    '/teacher/question-bank', { params },
  );
  return data.data;
}

export async function createQuestionBankItem(payload: QuestionBankPayload): Promise<QuestionBankItem> {
  const { data } = await api.post<ApiResponse<QuestionBankItem>>('/teacher/question-bank', payload);
  return data.data;
}

export async function updateQuestionBankItem(id: number, payload: QuestionBankPayload): Promise<QuestionBankItem> {
  const { data } = await api.put<ApiResponse<QuestionBankItem>>(`/teacher/question-bank/${id}`, payload);
  return data.data;
}

export async function deleteQuestionBankItem(id: number): Promise<void> {
  await api.delete(`/teacher/question-bank/${id}`);
}

export async function addQuestionBankToExam(bankId: number, examId: number): Promise<{ question_id: number; exam_id: number }> {
  const { data } = await api.post<ApiResponse<{ question_id: number; exam_id: number }>>(
    `/teacher/question-bank/${bankId}/add-to-exam/${examId}`,
  );
  return data.data;
}

export async function fetchQuestionBankStats(): Promise<QuestionBankStats> {
  const { data } = await api.get<ApiResponse<QuestionBankStats>>('/teacher/question-bank/stats');
  return data.data;
}

/* ============================================================
   Admin: Time Extension
   ============================================================ */

export async function extendSessionTime(sessionId: number, minutes: number): Promise<SessionRecord> {
  const { data } = await api.post<ApiResponse<SessionRecord>>(
    `/admin/exam-sessions/${sessionId}/extend-time`, { minutes },
  );
  return data.data;
}

/* ============================================================
   Admin: Import/Export
   ============================================================ */

export async function importStudentsCsv(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<ApiResponse<{ imported: number; skipped: number; errors: string[] }>>(
    '/admin/import/students',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export async function importQuestionsCsv(file: File, examId: number): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('exam_id', String(examId));
  const { data } = await api.post<ApiResponse<{ imported: number; skipped: number; errors: string[] }>>(
    '/admin/import/questions',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data.data;
}

export function getExportUrl(type: 'students' | 'questions' | 'results', examId?: number): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
  const token = useAuthStore.getState().token;
  const auth = token ? `?token=${token}` : '';

  switch (type) {
    case 'students':
      return `${base}/admin/export/students${auth}`;
    case 'questions':
      return `${base}/admin/export/exams/${examId}/questions${auth}`;
    case 'results':
      return `${base}/admin/export/exams/${examId}/results${auth}`;
  }
}

export function getTemplateUrl(type: 'students' | 'questions'): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
  return `${base}/admin/template/${type}`;
}

/* ============================================================
   Admin: Analytics
   ============================================================ */

export interface AnalyticsOverview {
  total_exams: number;
  total_sessions: number;
  finished_sessions: number;
  average_score: number | null;
  score_distribution: Record<string, number>;
  exams_per_subject: Record<string, number>;
  activity_last_30_days: { date: string; count: number }[];
}

export interface ExamAnalyticsData {
  exam: { id: number; title: string; subject: string | null; questions_count: number };
  summary: {
    total_participants: number;
    average_score: number | null;
    median_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    average_time_minutes: number | null;
    total_cheats: number;
  };
  score_distribution: Record<string, number>;
  question_analysis: {
    question_id: number;
    type: string;
    question_text: string;
    total_answers: number;
    wrong_count: number;
    difficulty_index: number | null;
    answer_distribution: Record<number, number>;
  }[];
}

export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { data } = await api.get<ApiResponse<AnalyticsOverview>>('/admin/analytics/overview');
  return data.data;
}

export async function fetchExamAnalytics(examId: number): Promise<ExamAnalyticsData> {
  const { data } = await api.get<ApiResponse<ExamAnalyticsData>>(`/admin/analytics/exam/${examId}`);
  return data.data;
}

export async function fetchClassAnalytics(classId: number): Promise<unknown> {
  const { data } = await api.get<ApiResponse<unknown>>(`/admin/analytics/class/${classId}`);
  return data.data;
}

export async function fetchSubjectAnalytics(subjectId: number): Promise<unknown> {
  const { data } = await api.get<ApiResponse<unknown>>(`/admin/analytics/subject/${subjectId}`);
  return data.data;
}

/* ============================================================
   Admin: Gradebook
   ============================================================ */

export interface GradebookClass {
  class_id: number;
  class_name: string;
  students_count: number;
  class_average: number | null;
  exams: { id: number; title: string; subject: string | null }[];
  students: {
    user_id: number;
    name: string;
    email: string;
    grades: { exam_id: number; score: number | null; status: string }[];
    average_score: number | null;
    exams_taken: number;
  }[];
}

export async function fetchGradebook(classId?: number): Promise<GradebookClass[]> {
  const { data } = await api.get<ApiResponse<GradebookClass[]>>('/admin/gradebook', {
    params: classId ? { class_id: classId } : undefined,
  });
  return data.data;
}

export function getGradebookExportUrl(classId?: number): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
  const params = classId ? `?class_id=${classId}` : '';
  return `${base}/admin/gradebook/export${params}`;
}
