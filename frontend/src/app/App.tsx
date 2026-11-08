import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { FullPageLoader } from '@/components/ui'
import { GuestOnly, HomeRedirect, RequireAuth, RequireRole } from './guards'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const OtpPage = lazy(() => import('@/features/auth/OtpPage'))
const FirstPasswordChangePage = lazy(() => import('@/features/auth/FirstPasswordChangePage'))
const RegisterEmailPage = lazy(() => import('@/features/auth/RegisterEmailPage'))

const StudentDashboardPage = lazy(() => import('@/features/student/StudentDashboardPage'))
const StudentSubjectsPage = lazy(() => import('@/features/student/StudentSubjectsPage'))
const StudentSubjectPage = lazy(() => import('@/features/student/StudentSubjectPage'))
const StudentAssignmentsPage = lazy(() => import('@/features/student/StudentAssignmentsPage'))
const StudentAssignmentPage = lazy(() => import('@/features/student/StudentAssignmentPage'))
const StudentMissingPage = lazy(() => import('@/features/student/StudentMissingPage'))

const TeacherDashboardPage = lazy(() => import('@/features/teacher/TeacherDashboardPage'))
const TeacherAssignmentsPage = lazy(() => import('@/features/teacher/TeacherAssignmentsPage'))
const TeacherAssignmentFormPage = lazy(() => import('@/features/teacher/TeacherAssignmentFormPage'))
const TeacherAssignmentPage = lazy(() => import('@/features/teacher/TeacherAssignmentPage'))

const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('@/features/admin/AdminUsersPage'))
const AdminGroupsPage = lazy(() => import('@/features/admin/AdminGroupsPage'))
const AdminSubjectsPage = lazy(() => import('@/features/admin/AdminSubjectsPage'))
const AdminAssignmentsPage = lazy(() => import('@/features/admin/AdminAssignmentsPage'))
const AdminFilesPage = lazy(() => import('@/features/admin/AdminFilesPage'))
const AdminAuditPage = lazy(() => import('@/features/admin/AdminAuditPage'))
const AdminEmailLogPage = lazy(() => import('@/features/admin/AdminEmailLogPage'))
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage'))

const ChatPage = lazy(() => import('@/features/chat/ChatPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const NotFoundPage = lazy(() => import('@/features/errors/ErrorPages'))
const ForbiddenPage = lazy(() =>
  import('@/features/errors/ErrorPages').then((module) => ({ default: module.ForbiddenPage })),
)

export function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/otp" element={<OtpPage />} />
          <Route path="/auth/first-password-change" element={<FirstPasswordChangePage />} />
          <Route path="/auth/register-email" element={<RegisterEmailPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="403" element={<ForbiddenPage />} />

            <Route path="student" element={<RequireRole roles={['STUDENT']} />}>
              <Route index element={<StudentDashboardPage />} />
              <Route path="subjects" element={<StudentSubjectsPage />} />
              <Route path="subjects/:subjectId" element={<StudentSubjectPage />} />
              <Route path="assignments" element={<StudentAssignmentsPage />} />
              <Route path="assignments/:id" element={<StudentAssignmentPage />} />
              <Route path="missing" element={<StudentMissingPage />} />
            </Route>

            <Route path="teacher" element={<RequireRole roles={['TEACHER']} />}>
              <Route index element={<TeacherDashboardPage />} />
              <Route path="assignments" element={<TeacherAssignmentsPage />} />
              <Route path="assignments/new" element={<TeacherAssignmentFormPage />} />
              <Route path="assignments/:id" element={<TeacherAssignmentPage />} />
              <Route path="assignments/:id/edit" element={<TeacherAssignmentFormPage />} />
            </Route>

            <Route path="admin" element={<RequireRole roles={['ADMIN']} />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="groups" element={<AdminGroupsPage />} />
              <Route path="subjects" element={<AdminSubjectsPage />} />
              <Route path="assignments" element={<AdminAssignmentsPage />} />
              <Route path="files" element={<AdminFilesPage />} />
              <Route path="audit" element={<AdminAuditPage />} />
              <Route path="email-log" element={<AdminEmailLogPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:roomId" element={<ChatPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
