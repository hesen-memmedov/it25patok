import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Copy, Info, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn, copyToClipboard } from '@/lib/utils'
import { Button } from './Button'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-primary-600', className)} aria-hidden />
}

export function FullPageLoader({ label = 'Yüklənir…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-500 opacity-20 blur-xl" />
        <Spinner className="h-7 w-7" />
      </div>
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-violet-50 text-primary-500 ring-1 ring-primary-100 dark:from-primary-500/10 dark:to-violet-500/10 dark:text-primary-300 dark:ring-primary-400/15">
        {icon ?? <Info className="h-7 w-7" />}
      </div>
      <h3 className="font-display text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Progress({
  value,
  tone = 'primary',
  className,
}: {
  value: number
  tone?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const tones = {
    primary: 'bg-gradient-to-r from-primary-500 to-violet-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
  }
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full bg-[#e8e4c8] dark:bg-white/10', className)}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'violet'
  className?: string
}) {
  const tones = {
    primary: 'from-primary-500/15 to-primary-500/5 text-primary-600 dark:text-primary-300',
    violet: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-300',
    success: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-300',
    warning: 'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-300',
    danger: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-300',
  }
  return (
    <div className={cn('surface relative overflow-hidden p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div className="mt-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          {hint && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br',
              tones[tone],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Axtar…',
  className,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onSubmit?: () => void
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit?.()
        }}
      >
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-[#ddd6a8] bg-white pl-10 pr-9 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
          aria-label={placeholder}
        />
      </form>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          aria-label="Təmizlə"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number
  totalPages: number
  total?: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Səhifə {page} / {totalPages}
        {typeof total === 'number' && ` · ${total} nəticə`}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Əvvəlki
        </Button>
        <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Sonrakı
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: ReactNode
  description?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      {(label || description) && (
        <div className="min-w-0">
          {label && <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</div>}
          {description && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</div>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : 'Açar'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-white/20',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-400/20 dark:bg-primary-500/10 dark:text-primary-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200',
    danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200',
  }
  const icons = {
    info: <Info className="h-4 w-4" />,
    success: <Check className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    danger: <AlertCircle className="h-4 w-4" />,
  }
  return (
    <div className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', tones[tone], className)}>
      <span className="mt-0.5 shrink-0">{icons[tone]}</span>
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5', 'leading-5 opacity-90')}>{children}</div>}
      </div>
    </div>
  )
}

export function CopyButton({
  value,
  label = 'Kopyala',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => {
        void copyToClipboard(value)
          .then(() => {
            setCopied(true)
            toast.success('Kopyalandı')
            window.setTimeout(() => setCopied(false), 1800)
          })
          .catch(() => toast.error('Kopyalamaq mümkün olmadı'))
      }}
      {...rest}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Kopyalandı' : label}
    </Button>
  )
}
