import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'soft'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-primary-600 to-violet-600 text-white shadow-soft hover:from-primary-500 hover:to-violet-500 active:scale-[0.985]',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-[#e8e4c8]',
  outline:
    'border border-[#cfc799] bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-primary-400/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-200',
  ghost:
    'text-slate-600 hover:bg-[#e8e4c8] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:scale-[0.985]',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 active:scale-[0.985]',
  soft:
    'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-500/15 dark:text-primary-200 dark:hover:bg-primary-500/25',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-xl px-3 text-[13px]',
  md: 'h-11 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-2xl px-6 text-[15px]',
  icon: 'h-10 w-10 rounded-xl',
}

// Shared style helper exported for links/buttons — fine to keep alongside the component.
// eslint-disable-next-line react-refresh/only-export-components
export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
