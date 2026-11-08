import { cn } from '@/lib/utils'

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('max-w-7xl mx-auto px-4', className)}>{children}</div>
  )
}