import { cn } from '@/lib/utils'

export function Col({ className, children, sm: _sm = 12, md = 6, lg = 4, xl = 3 }: { className?: string; children: React.ReactNode; sm?: number; md?: number; lg?: number; xl?: number }) {
  const classes = cn(
    'w-full',
    { 'flex-1': md > 1, 'w-full md:w-1/2': md === 6 },
    { 'flex-1 lg:w-1/3': lg === 4 },
    { 'flex-1 xl:w-1/4': xl === 3 },
    className,
  )
  
  return (
    <div className={classes}>{children}</div>
  )
}