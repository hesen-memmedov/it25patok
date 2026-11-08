import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br from-primary-500 via-primary-600 to-violet-600 text-white shadow-glow',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-full w-full" fill="none">
        <path d="M8 15.5 20 9l12 6.5L20 22 8 15.5Z" fill="white" fillOpacity="0.95" />
        <path d="M13 19v6.2c0 1.8 3.1 3.8 7 3.8s7-2 7-3.8V19" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M32 15.5v7" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="32" cy="24.5" r="1.6" fill="white" />
      </svg>
    </span>
  )
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="İT25 PATOK ana səhifə">
      <LogoMark />
      {!compact && (
        <span className="min-w-0 leading-none">
          <span className="block font-display text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            İT25 <span className="gradient-text">PATOK</span>
          </span>
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">
            tədris platforması
          </span>
        </span>
      )}
    </Link>
  )
}
