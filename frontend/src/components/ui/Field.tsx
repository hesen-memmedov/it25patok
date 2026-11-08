import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-xl border bg-white text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-[#efeada] disabled:text-slate-500 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-white/[0.03] dark:disabled:text-slate-500'

interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leftIcon, rightIcon, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          fieldBase,
          'h-11 px-3.5',
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          invalid
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60'
            : 'border-[#ddd6a8] dark:border-white/10',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      {rightIcon && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>
      )}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        fieldBase,
        'min-h-[108px] resize-y px-3.5 py-3 leading-6',
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60'
          : 'border-[#ddd6a8] dark:border-white/10',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBase,
        'h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3.5 pr-9',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20fill%3D%27none%27%20viewBox%3D%270%200%2020%2020%27%3E%3Cpath%20stroke%3D%27%2364748b%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%20stroke-width%3D%271.5%27%20d%3D%27m6%208%204%204%204-4%27/%3E%3C/svg%3E")]',
        invalid
          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-500/60'
          : 'border-[#ddd6a8] dark:border-white/10',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  )
})

export function Checkbox({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300', className)}>
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#cfc799] text-primary-600 focus:ring-primary-500 dark:border-white/20 dark:bg-white/10"
        {...rest}
      />
      <span>{label}</span>
    </label>
  )
}

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-[13px] font-semibold text-slate-700 dark:text-slate-200', className)} {...rest} />
  )
}
