import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MessageCircle,
  ScrollText,
  Settings,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  end?: boolean
  badge?: 'chat'
  mobile?: boolean
}

const dashboard: NavItem = { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true }

export const adminNav: NavItem[] = [
  dashboard,
  { to: '/admin/users', labelKey: 'users', icon: Users },
  { to: '/admin/groups', labelKey: 'groups', icon: GraduationCap },
  { to: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
  { to: '/admin/assignments', labelKey: 'allAssignments', icon: ClipboardList },
  { to: '/admin/files', labelKey: 'files', icon: FolderOpen },
  { to: '/chat', labelKey: 'chat', icon: MessageCircle, badge: 'chat' },
  { to: '/admin/audit', labelKey: 'audit', icon: ScrollText },
  { to: '/admin/email-log', labelKey: 'emailLog', icon: Mail },
  { to: '/admin/settings', labelKey: 'settings', icon: Settings },
  { to: '/profile', labelKey: 'profile', icon: User },
]

export const teacherNav: NavItem[] = [
  { to: '/teacher', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/teacher/assignments', labelKey: 'assignments', icon: ClipboardList },
  { to: '/teacher/missing', labelKey: 'missingStudents', icon: AlertTriangle },
  { to: '/chat', labelKey: 'chat', icon: MessageCircle, badge: 'chat' },
  { to: '/profile', labelKey: 'profile', icon: User },
]

export const studentNav: NavItem[] = [
  { to: '/student', labelKey: 'home', icon: LayoutDashboard, end: true },
  { to: '/student/subjects', labelKey: 'mySubjects', icon: BookOpen },
  { to: '/student/assignments', labelKey: 'allAssignments', icon: ClipboardList },
  { to: '/student/missing', labelKey: 'missing', icon: AlertTriangle },
  { to: '/chat', labelKey: 'chat', icon: MessageCircle, badge: 'chat' },
  { to: '/profile', labelKey: 'profile', icon: User },
]

export function navForRole(role: Role): NavItem[] {
  if (role === 'ADMIN') return adminNav
  if (role === 'TEACHER') return teacherNav
  return studentNav
}

export function bottomNavForRole(role: Role): NavItem[] {
  if (role === 'ADMIN') {
    return [
      { to: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/users', labelKey: 'users', icon: Users },
      { to: '/admin/subjects', labelKey: 'subjects', icon: BookOpen },
      { to: '/chat', labelKey: 'chat', icon: MessageCircle, badge: 'chat' },
    ]
  }
  if (role === 'TEACHER') {
    return [
      { to: '/teacher', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
      { to: '/teacher/assignments', labelKey: 'assignments', icon: ClipboardList },
      { to: '/teacher/missing', labelKey: 'missingStudents', icon: AlertTriangle },
      { to: '/chat', labelKey: 'chat', icon: MessageCircle, badge: 'chat' },
      { to: '/profile', labelKey: 'profile', icon: User },
    ]
  }
  return [
    { to: '/student', labelKey: 'home', icon: LayoutDashboard, end: true },
    { to: '/student/subjects', labelKey: 'mySubjects', icon: BookOpen },
    { to: '/student/missing', labelKey: 'missing', icon: AlertTriangle },
    { to: '/chat', labelKey: 'chat', icon: MessageCircle, badge: 'chat' },
    { to: '/profile', labelKey: 'profile', icon: User },
  ]
}

export const adminMoreNav: NavItem[] = [
  { to: '/admin/groups', labelKey: 'groups', icon: GraduationCap },
  { to: '/admin/assignments', labelKey: 'allAssignments', icon: ClipboardList },
  { to: '/admin/files', labelKey: 'files', icon: FolderOpen },
  { to: '/admin/audit', labelKey: 'audit', icon: ScrollText },
  { to: '/admin/email-log', labelKey: 'emailLog', icon: Mail },
  { to: '/admin/settings', labelKey: 'settings', icon: Settings },
  { to: '/profile', labelKey: 'profile', icon: User },
]

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
