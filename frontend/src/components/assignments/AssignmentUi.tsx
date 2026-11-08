import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileText, Paperclip, Users } from 'lucide-react'
import { Badge, Progress } from '@/components/ui'
import {
  assignmentTypeLabel,
  cn,
  formatDeadline,
  isOverdue,
  percent,
  statusLabel,
  statusTone,
} from '@/lib/utils'
import type { Assignment } from '@/lib/types'

const typeTone: Record<string, 'primary' | 'warning' | 'success'> = {
  SERBEST_ISH: 'primary',
  KOLLOKVIUM: 'warning',
  LABORATORIYA: 'success',
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge tone={typeTone[type] ?? 'default'}>{assignmentTypeLabel(type)}</Badge>
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  return (
    <Badge tone={statusTone(status)} className={className}>
      {statusLabel(status)}
    </Badge>
  )
}

export function DeadlineLine({
  deadline,
  className,
  withIcon = true,
}: {
  deadline: number | null | undefined
  className?: string
  withIcon?: boolean
}) {
  const overdue = isOverdue(deadline)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400',
        className,
      )}
    >
      {withIcon && (overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />)}
      {formatDeadline(deadline)}
    </span>
  )
}

export function AssignmentCard({
  assignment,
  to,
  showTeacher = true,
  compact = false,
}: {
  assignment: Assignment
  to: string
  showTeacher?: boolean
  compact?: boolean
}) {
  const done = assignment.myStatus === 'SUBMITTED' || assignment.myStatus === 'LATE' || assignment.myStatus === 'GRADED'
  return (
    <Link
      to={to}
      className={cn(
        'group surface relative flex flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-glow dark:hover:border-primary-400/30 sm:p-5',
        compact && 'gap-2.5 p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={assignment.type} />
          {assignment.archived && <Badge tone="muted">Arxiv</Badge>}
        </div>
        {assignment.myStatus && (
          <StatusBadge status={assignment.myStatus} />
        )}
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
          {assignment.title}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
          {assignment.subjectName}
          {showTeacher && assignment.teacherName ? ` · ${assignment.teacherName}` : ''}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#e5dfb4] pt-3 dark:border-white/[0.07]">
        <DeadlineLine deadline={assignment.deadline} />
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
          {assignment.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {assignment.attachmentCount}
            </span>
          )}
          {done ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Clock3 className="h-3.5 w-3.5 text-amber-500" />
          )}
        </div>
      </div>
    </Link>
  )
}

export function TeacherAssignmentCard({
  assignment,
  to,
}: {
  assignment: Assignment
  to: string
}) {
  return (
    <Link
      to={to}
      className="group surface flex flex-col gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-glow dark:hover:border-primary-400/30 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <TypeBadge type={assignment.type} />
        {assignment.archived ? <Badge tone="muted">Arxiv</Badge> : <Badge tone="success">Aktiv</Badge>}
      </div>
      <div>
        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
          {assignment.title}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{assignment.subjectName}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {assignment.groupCodes.join(', ') || 'Qrup yoxdur'}
        </span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="inline-flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {assignment.submittedCount} təhvil
        </span>
      </div>
      <div className="mt-auto border-t border-[#e5dfb4] pt-3 dark:border-white/[0.07]">
        <DeadlineLine deadline={assignment.deadline} />
      </div>
    </Link>
  )
}

export function SubmissionProgress({ submitted, total }: { submitted: number; total: number }) {
  const value = percent(submitted, total)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {total} tələbədən <span className="font-bold text-slate-900 dark:text-white">{submitted}</span>-u təhvil verib
        </span>
        <span className="font-bold text-primary-600 dark:text-primary-300">{value}%</span>
      </div>
      <Progress value={value} tone={value >= 80 ? 'success' : value >= 40 ? 'primary' : 'warning'} />
    </div>
  )
}
