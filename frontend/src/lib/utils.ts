import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { AssignmentType, SubmissionStatus } from './types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const AZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
]

const AZ_WEEKDAYS = ['bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə']

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function formatDate(value: number | string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getDate()} ${AZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function formatDateTime(value: number | string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${formatDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatTime(value: number | string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatSubmittedAt(value: number | string | Date | null | undefined): string {
  return value ? formatDateTime(value) : '—'
}

export function formatWeekday(value: number | string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return AZ_WEEKDAYS[date.getDay()]
}

export function relativeTime(value: number | null | undefined): string {
  if (!value) return ''
  const diff = Date.now() - value
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (abs < minute) return 'indi'
  if (abs < hour) return `${Math.round(abs / minute)} dəq əvvəl`
  if (abs < day) return `${Math.round(abs / hour)} saat əvvəl`
  if (abs < 7 * day) return `${Math.round(abs / day)} gün əvvəl`
  return formatDate(value)
}

export function daysUntil(value: number | null | undefined): number | null {
  if (!value) return null
  return Math.ceil((value - Date.now()) / 86_400_000)
}

export function formatDeadline(value: number | null | undefined): string {
  if (!value) return 'Deadline yoxdur'
  const days = Math.ceil((value - Date.now()) / 86_400_000)
  if (days < 0) return `${formatDateTime(value)} · ${Math.abs(days)} gün gecikib`
  if (days === 0) return `${formatDateTime(value)} · bu gün`
  if (days === 1) return `${formatDateTime(value)} · sabah`
  return `${formatDateTime(value)} · ${days} gün qalır`
}

export function isOverdue(value: number | null | undefined): boolean {
  return Boolean(value && value < Date.now())
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  const a = (firstName ?? '').trim()
  const b = (lastName ?? '').trim()
  return `${a.charAt(0)}${b.charAt(0)}`.toUpperCase() || 'İP'
}

export function fullName(user: { firstName: string; lastName: string } | null | undefined): string {
  return user ? `${user.firstName} ${user.lastName}`.trim() : ''
}

export function truncate(value: string, max = 120): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function toDateTimeInput(value: number | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function fromDateTimeInput(value: string): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

export function todayInput(): string {
  return toDateTimeInput(Date.now())
}

export function percent(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  SERBEST_ISH: 'Sərbəst iş',
  KOLLOKVIUM: 'Kollokvium',
  LABORATORIYA: 'Laboratoriya işi',
}

export const ASSIGNMENT_TYPE_SHORT: Record<AssignmentType, string> = {
  SERBEST_ISH: 'Sərbəst',
  KOLLOKVIUM: 'Kollokvium',
  LABORATORIYA: 'Lab',
}

export function assignmentTypeLabel(type: AssignmentType | string | null | undefined): string {
  if (!type) return '—'
  return ASSIGNMENT_TYPE_LABELS[type as AssignmentType] ?? type
}

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  SUBMITTED: 'Təhvil verib',
  LATE: 'Gecikmiş',
  MISSING: 'Verməyib',
  GRADED: 'Qiymətləndirilib',
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Verməyib'
  if (status === 'PENDING') return 'Gözləyir'
  return STATUS_LABELS[status as SubmissionStatus] ?? status
}

export function statusTone(status: string | null | undefined): 'success' | 'warning' | 'danger' | 'primary' | 'muted' {
  switch (status) {
    case 'SUBMITTED':
      return 'success'
    case 'LATE':
      return 'warning'
    case 'MISSING':
      return 'danger'
    case 'GRADED':
      return 'primary'
    default:
      return 'muted'
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin'
    case 'TEACHER':
      return 'Müəllim'
    case 'STUDENT':
      return 'Tələbə'
    default:
      return role
  }
}

export function roleHome(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'TEACHER':
      return '/teacher'
    default:
      return '/student'
  }
}

export function fileCategory(extension: string | null | undefined, mimeType?: string | null): string {
  const ext = (extension ?? '').toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext)) return 'image'
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'].includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  if (['docx', 'doc', 'odt', 'rtf'].includes(ext)) return 'docx'
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) return 'sheet'
  if (['pptx', 'ppt', 'odp'].includes(ext)) return 'slides'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive'
  if (['txt', 'md', 'json', 'xml', 'yml', 'yaml', 'java', 'ts', 'tsx', 'js', 'jsx', 'css',
    'html', 'sql', 'log', 'sh', 'py', 'c', 'cpp', 'cs', 'php', 'go', 'rs', 'kt', 'swift'].includes(ext)) return 'text'
  if (mimeType?.startsWith('image/')) return 'image'
  if (mimeType?.startsWith('video/')) return 'video'
  if (mimeType?.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType?.startsWith('text/')) return 'text'
  return 'other'
}

export function safeFileDownloadName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_')
}

export function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
  return Promise.reject(new Error('Bu brauzer clipboard-u dəstəkləmir.'))
}

export function errorMessage(error: unknown, fallback = 'Xəta baş verdi.'): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const candidate = error as {
      response?: { data?: { error?: { message?: string } } }
      message?: string
    }
    const apiMessage = candidate.response?.data?.error?.message
    if (apiMessage) return apiMessage
    if (candidate.message) return candidate.message
  }
  return fallback
}
