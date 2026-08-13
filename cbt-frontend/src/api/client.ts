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
