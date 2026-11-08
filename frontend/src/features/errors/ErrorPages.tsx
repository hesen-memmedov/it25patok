import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Button, buttonStyles } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { roleHome } from '@/lib/utils'

export default function NotFoundPage() {
  const user = useAuthStore((state) => state.user)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <Logo />
      <div className="mt-10 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-50 to-violet-50 text-primary-500 ring-1 ring-primary-100 dark:from-primary-500/10 dark:to-violet-500/10 dark:text-primary-300 dark:ring-primary-400/15">
        <Compass className="h-9 w-9" />
      </div>
      <p className="mt-6 font-display text-7xl font-extrabold tracking-tight gradient-text">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">Səhifə tapılmadı</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        Axtardığınız səhifə mövcud deyil, köçürülüb və ya bu ünvana giriş icazəniz yoxdur.
      </p>
      <Link to={user ? roleHome(user.role) : '/login'} className={buttonStyles('primary', 'md', 'mt-6')}>
        {user ? 'Ana səhifəyə qayıt' : 'Girişə qayıt'}
      </Link>
    </div>
  )
}

export function ForbiddenPage() {
  const user = useAuthStore((state) => state.user)
  return (
    <div className="page-container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-display text-7xl font-extrabold gradient-text">403</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">Giriş qadağandır</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        Bu bölməyə giriş icazəniz yoxdur. Əgər bunun səhv olduğunu düşünürsünüzsə, adminə müraciət edin.
      </p>
      <Button
        className="mt-6"
        onClick={() => {
          window.location.href = user ? roleHome(user.role) : '/login'
        }}
      >
        Ana səhifəyə qayıt
      </Button>
    </div>
  )
}
