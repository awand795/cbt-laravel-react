import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LandingPage from './LandingPage'
import LoginPage from './LoginPage'
import DashboardPage from './DashboardPage'
import ExamRoomPage from './ExamRoomPage'
import AdminDashboardPage from './AdminDashboardPage'
import TeacherDashboardPage from './TeacherDashboardPage'
import { useAuthStore } from './store/authStore'
import { redirectIfAuthed, requireAdmin, requireStudent, requireTeacher } from './router/guards'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: () => {
    redirectIfAuthed()
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
  beforeLoad: requireStudent,
})

const examRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exam/$sessionId',
  component: ExamRoomPage,
  beforeLoad: requireStudent,
})

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboardPage,
  beforeLoad: requireAdmin,
})

const teacherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher',
  component: TeacherDashboardPage,
  beforeLoad: requireTeacher,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  examRoomRoute,
  adminRoute,
  teacherRoute,
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Saat sesi dibersihkan (logout / token kedaluwarsa), invalidasi router agar
// sebelumLoad di route terproteksi berjalan ulang → user diarahkan ke /login.
useAuthStore.subscribe((state, prev) => {
  if (prev.token && !state.token) {
    void router.invalidate()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
