import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'

const highlights = [
  { icon: ShieldCheck, text: 'E-poçt OTP ilə ikiaddımlı təhlükəsiz giriş' },
  { icon: CheckCircle2, text: 'Tapşırıq, təhvil və borc izləmə vahid yerdə' },
  { icon: MessageSquare, text: 'Şifrələnmiş ümumi və qrup çatı' },
]

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
}: {
  title: ReactNode
  subtitle: ReactNode
  children: ReactNode
  footer?: ReactNode
  showBack?: boolean
}) {
  return (
    <div className="min-h-dvh bg-[#ebe6b0] dark:bg-[#1a0e12] lg:grid lg:grid-cols-[1.02fr_1fr]">
      <aside className="relative hidden overflow-hidden gradient-bg p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-violet-900/30 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight">İT25 PATOK</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">tədris platforması</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-lg py-14">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Yalnız İT25A1 və İT25A2 üçün
          </p>
          <h2 className="text-balance font-display text-[40px] font-extrabold leading-[1.12] tracking-tight xl:text-[46px]">
            Tədris prosesiniz,
            <br />
            <span className="text-white/80">bir platformada.</span>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-white/70">
            Müəllimlər mövzu paylaşır, tələbələr işlərini təhvil verir, borclar və qiymətlər şəffaf izlənir.
          </p>
          <ul className="mt-8 space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/55">
          <span>© {new Date().getFullYear()} İT25 PATOK</span>
          <span>it25patok.pages.dev</span>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            <div className="mb-8">
              {showBack && (
                <Link
                  to="/login"
                  className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Girişə qayıt
                </Link>
              )}
              <h1 className="font-display text-[30px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          {footer ?? 'Hesab yalnız admin tərəfindən yaradılır. Girişdə problem varsa müəlliminizə müraciət edin.'}
        </div>
      </main>
    </div>
  )
}
