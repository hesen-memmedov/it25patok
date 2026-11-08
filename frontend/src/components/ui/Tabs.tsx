import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
}

export function Tabs<T extends string>({ items, value, onChange, className, size = 'md' }: TabsProps<T>) {
  return (
    <div
      className={cn(
        'flex gap-1 overflow-x-auto rounded-xl bg-[#e8e4c8] p-1 scrollbar-none dark:bg-white/[0.06]',
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg font-semibold transition',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-[13px]',
              active
                ? 'bg-white text-primary-700 shadow-sm dark:bg-white/15 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  active
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/25 dark:text-primary-200'
                    : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
