import { redirect, type BeforeLoadContextOptions } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore';

type GuardContext = BeforeLoadContextOptions<any, any, any, any, any, any, any, any, any>;

/** Halaman tujuan default untuk setiap role. */
export function homePathForRole(role: string | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  if (role === 'student') return '/dashboard';
  return '/';
}

/**
 * Menolak akses pengguna yang belum login — arahkan ke /login
 * sambil menyimpan halaman tujuan agar bisa kembali setelah login.
 */
export function requireAuth(ctx: GuardContext): void {
  const { token } = useAuthStore.getState();
  if (!token) {
    throw redirect({
      to: '/login',
      search: { redirect: ctx.location.href },
    });
  }
}

/** Hanya role student. */
export function requireStudent(ctx: GuardContext): void {
  const { token, user } = useAuthStore.getState();
  if (!token) {
    throw redirect({
      to: '/login',
      search: { redirect: ctx.location.href },
    });
  }
  if (user && user.role !== 'student') {
    throw redirect({ to: homePathForRole(user.role) });
  }
}

/** Hanya role admin. */
export function requireAdmin(ctx: GuardContext): void {
  const { token, user } = useAuthStore.getState();
  if (!token) {
    throw redirect({
      to: '/login',
      search: { redirect: ctx.location.href },
    });
  }
  if (user && user.role !== 'admin') {
    throw redirect({ to: homePathForRole(user.role) });
  }
}

/** Hanya role guru. */
export function requireTeacher(ctx: GuardContext): void {
  const { token, user } = useAuthStore.getState();
  if (!token) {
    throw redirect({
      to: '/login',
      search: { redirect: ctx.location.href },
    });
  }
  if (user && user.role !== 'teacher') {
    throw redirect({ to: homePathForRole(user.role) });
  }
}

/**
 * Pengguna yang sudah login tidak perlu membuka /login lagi —
 * langsung arahkan ke halaman sesuai perannya.
 */
export function redirectIfAuthed(): void {
  const { token, user } = useAuthStore.getState();
  if (!token) return;
  throw redirect({ to: homePathForRole(user?.role) });
}
