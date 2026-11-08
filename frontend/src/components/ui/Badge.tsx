import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'outline'

const tones: Record<BadgeTone, string> = {
  default: 'bg-[#e8e4c8] text-slate-700 dark:bg-white/10 dark:text-slate-200',
  primary: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200/70 dark:bg-primary-500/15 dark:text-primary-200 dark:ring-primary-400/20',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20',
  muted: 'bg-[#e8e4c8] text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  outline: 'border border-[#cfc799] text-slate-600 dark:border-white/15 dark:text-slate-300',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  icon?: ReactNode
}

export function Badge({ className, tone = 'default', icon, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}
