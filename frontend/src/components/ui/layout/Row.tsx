import { cn } from '@/lib/utils'

export function Row({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-row -mx-2', className)}>{children}</div>
  )
}