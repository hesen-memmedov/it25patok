import { cn } from '@/lib/utils'

interface TableProps {
  className?: string
  children: React.ReactNode
  responsive?: boolean
}

export function Table({ className, children, responsive = false }: TableProps) {
  const tableClass = cn(
    'w-full bg-white/50 dark:bg-black/30 rounded-lg overflow-hidden',
    responsive ? 'divide-y divide-white/10' : '',
    className,
  )
  
  return (
    <table className={tableClass}>
      {children}
    </table>
  )
}

interface TheadProps {
  className?: string
  children: React.ReactNode
}

export function Thead({ className, children }: TheadProps) {
  return (
    <thead className={cn('bg-white/50 dark:bg-black/30', className)}>
      {children}
    </thead>
  )
}

interface TbodyProps {
  className?: string
  children: React.ReactNode
}

export function Tbody({ className, children }: TbodyProps) {
  return (
    <tbody className={cn('divide-y divide-white/10', className)}>
      {children}
    </tbody>
  )
}

interface TdProps {
  className?: string
}

export function Td({ className }: TdProps, children: React.ReactNode) {
  return (
    <td className={cn('px-3 py-2 text-sm text-slate-300', className)}>{children}</td>
  )
}

interface ThProps {
  className?: string
}

export function Th({ className }: ThProps, children: React.ReactNode) {
  return (
    <th className={cn('px-3 py-2 text-xs text-slate-400 fw-bold', className)}>{children}</th>
  )
}