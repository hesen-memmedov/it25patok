import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Alert, Button, Card, EmptyState, Progress, Skeleton, StatCard } from '@/components/ui'
import { AssignmentCard, DeadlineLine } from '@/components/assignments/AssignmentUi'
import { getData } from '@/lib/api'
import { formatDate, formatWeekday, percent } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { StudentDashboard, StudentSubject } from '@/lib/types'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Sabahın xeyir'
  if (hour < 18) return 'Günortan xeyir'
  return 'Axşamın xeyir'
}

export default function StudentDashboardPage() {
  const user = useAuthStore((state) => state.user)
  const dashboard = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => getData<StudentDashboard>('/student/dashboard'),
  })
  const subjects = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => getData<StudentSubject[]>('/student/subjects'),
  })

  const data = dashboard.data
  const today = new Date()

  return (
    <div className="page-container">
      <div className="relative mb-6 overflow-hidden rounded-3xl gradient-bg p-6 text-white shadow-soft sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-violet-900/25 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
              <Sparkles className="h-3.5 w-3.5" />
              {formatWeekday(today)}, {formatDate(today)}
            </div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[34px]">
              {greeting()}, {user?.firstName ?? 'tələbə'}!
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              {data && data.missing > 0
                ? `Hazırda ${data.missing} təhvil verilməmiş işiniz var. Onları vaxtında tamamlamağa çalışın.`
                : 'Bütün işləriniz qaydasındadır. Yeni tapşırıqları izləməyə davam edin.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/student/missing">
              <Button
                variant="secondary"
                className="border-0 bg-white text-primary-700 hover:bg-white/90"
                leftIcon={<AlertTriangle className="h-4 w-4" />}
              >
                Borclarım
              </Button>
            </Link>
            <Link to="/student/assignments">
              <Button
                variant="ghost"
                className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
                leftIcon={<ClipboardList className="h-4 w-4" />}
              >
                Tapşırıqlar
              </Button>
            </Link>
          </div>
        </div>
        {user?.groupCode && (
          <span className="relative z-10 mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {user.groupCode} qrupu
          </span>
        )}
      </div>

      {dashboard.isError && (
        <Alert tone="danger" className="mb-4" title="Məlumat yüklənə bilmədi">
          <button className="font-semibold underline" onClick={() => void dashboard.refetch()}>
            Yenidən cəhd et
          </button>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dashboard.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="surface p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-4 h-8 w-12" />
                <Skeleton className="mt-3 h-3 w-28" />
              </div>
            ))
          : (
            <>
              <StatCard
                label="Ümumi tapşırıq"
                value={data?.assignments ?? 0}
                hint="Qrupunuza təyin olunub"
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <StatCard
                label="Təhvil verib"
                value={data?.submitted ?? 0}
                hint="Uğurla tamamlanıb"
                tone="success"
                icon={<CheckCircle2 className="h-5 w-5" />}
              />
              <StatCard
                label="Verməyib"
                value={data?.missing ?? 0}
                hint="Diqqət tələb edir"
                tone={data && data.missing > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle className="h-5 w-5" />}
              />
              <StatCard
                label="Gecikmiş"
                value={data?.overdue ?? 0}
                hint="Deadline keçib"
                tone={data && data.overdue > 0 ? 'warning' : 'success'}
                icon={<CalendarClock className="h-5 w-5" />}
              />
            </>
          )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Yaxın deadline-lar</h2>
            <Link
              to="/student/assignments"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
            >
              Hamısına bax
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {dashboard.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="surface space-y-3 p-5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : data?.upcoming.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.upcoming.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  to={`/student/assignments/${assignment.id}`}
                />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<CalendarClock className="h-7 w-7" />}
                title="Yaxın deadline yoxdur"
                description="Yeni tapşırıqlar təyin olunanda burada görünəcək."
              />
            </Card>
          )}

          <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Fənlərim</h2>
            <Link
              to="/student/subjects"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
            >
              Bütün fənlər
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {subjects.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="surface p-5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-3 h-2 w-full" />
                  <Skeleton className="mt-3 h-3 w-24" />
                </div>
              ))}
            </div>
          ) : subjects.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {subjects.data.map((subject) => {
                const progress = percent(subject.submitted, subject.total)
                return (
                  <Link
                    key={subject.id}
                    to={`/student/subjects/${subject.id}`}
                    className="surface group p-4 transition hover:border-primary-200 hover:shadow-glow dark:hover:border-primary-400/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-bold text-slate-800 group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-300">
                            {subject.name}
                          </h3>
                          <span className="shrink-0 text-[11px] font-bold text-primary-600 dark:text-primary-300">{progress}%</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {subject.submitted}/{subject.total} təhvil · {subject.missing} borc
                        </p>
                        <Progress
                          value={progress}
                          tone={subject.missing > 0 ? 'warning' : 'success'}
                          className="mt-2.5 h-1.5"
                        />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<BookOpen className="h-7 w-7" />}
                title="Hələ fənn təyin olunmayıb"
                description="Müəllimlər tapşırıq paylaşanda fənlər burada görünəcək."
              />
            </Card>
          )}
        </section>

        <aside className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[#e5dfb4] px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Borclarım</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Təhvil verilməmiş işlər</p>
              </div>
              <Link
                to="/student/missing"
                className="rounded-lg p-1.5 text-primary-600 transition hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10"
                aria-label="Borclara bax"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {dashboard.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.missingItems.length ? (
              <ul className="divide-y divide-[#e5dfb4] dark:divide-white/[0.06]">
                {data.missingItems.slice(0, 6).map((item) => (
                  <li key={item.assignmentId}>
                    <Link
                      to={`/student/assignments/${item.assignmentId}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#efeada] dark:hover:bg-white/[0.035]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
                        <ClipboardList className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {item.subjectName}
                        </span>
                      </span>
                      <span className="shrink-0">
                        <DeadlineLine deadline={item.deadline} withIcon={false} className="text-[10px]" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<CheckCircle2 className="h-7 w-7" />}
                title="Borcunuz yoxdur"
                description="Bütün tapşırıqları təhvil vermisiniz."
                className="py-8"
              />
            )}
            {data && data.missingItems.length > 6 && (
              <div className="border-t border-[#e5dfb4] px-5 py-3 dark:border-white/10">
                <Link to="/student/missing" className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300">
                  Daha {data.missingItems.length - 6} borc
                </Link>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-500" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Ümumi nəticə</h2>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {data ? percent(data.submitted, data.assignments) : 0}%
              </span>
              <span className="pb-1 text-xs text-slate-500 dark:text-slate-400">təhvil faizi</span>
            </div>
            <Progress
              value={data ? percent(data.submitted, data.assignments) : 0}
              tone={data && data.missing === 0 ? 'success' : 'primary'}
              className="mt-2"
            />
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-emerald-50 px-2 py-2.5 dark:bg-emerald-500/10">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{data?.submitted ?? 0}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600/80 dark:text-emerald-400/80">Təhvil</p>
              </div>
              <div className="rounded-xl bg-rose-50 px-2 py-2.5 dark:bg-rose-500/10">
                <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{data?.missing ?? 0}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600/80 dark:text-rose-400/80">Borc</p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
