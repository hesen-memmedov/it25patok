import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, BookOpen, CalendarClock, CheckCircle2, Flame } from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { DeadlineLine, TypeBadge } from '@/components/assignments/AssignmentUi'
import { getData } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/utils'
import type { MissingGroup } from '@/lib/types'

export default function StudentMissingPage() {
  const query = useQuery({
    queryKey: ['student-missing'],
    queryFn: () => getData<MissingGroup[]>('/student/missing'),
  })

  const total = (query.data ?? []).reduce((sum, group) => sum + group.items.length, 0)
  const overdue = (query.data ?? []).reduce(
    (sum, group) => sum + group.items.filter((item) => item.daysLate > 0).length,
    0,
  )

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Tələbə bölməsi"
        title="Borclarım"
        description="Bütün fənlər üzrə təhvil vermədiyiniz işlər. Deadline keçmiş işlər qırmızı ilə işarələnir."
        actions={
          <Link to="/student/assignments">
            <Button variant="outline">Tapşırıqlara bax</Button>
          </Link>
        }
      />

      {query.isError && (
        <Alert tone="danger" className="mb-4" title="Borclar yüklənə bilmədi">
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Yenidən cəhd et
          </button>
        </Alert>
      )}

      {!query.isLoading && query.data && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Fənn sayı</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{query.data.length}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ümumi borc</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{total}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Gecikmiş</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{overdue}</p>
            </div>
          </Card>
        </div>
      )}

      {query.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="surface space-y-3 p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : query.data?.length ? (
        <div className="space-y-4">
          {query.data.map((group) => (
            <Card key={group.subjectId} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">{group.subjectName}</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{group.items.length} təhvil verilməyib</p>
                  </div>
                </div>
                <Link
                  to={`/student/subjects/${group.subjectId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
                >
                  Fənnə keç
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {group.items.map((item) => {
                  const isLate = item.daysLate > 0
                  return (
                    <li key={item.assignmentId}>
                      <Link
                        to={`/student/assignments/${item.assignmentId}`}
                        className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.035]"
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            isLate
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
                          )}
                        >
                          <CalendarClock className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {item.title}
                            </span>
                            <TypeBadge type={item.type} />
                          </span>
                          <span className="mt-1 block">
                            <DeadlineLine deadline={item.deadline} className={cn(isLate && 'text-rose-600 dark:text-rose-400')} />
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {isLate ? (
                            <Badge tone="danger" icon={<Flame className="h-3 w-3" />}>
                              {item.daysLate} gün gecikib
                            </Badge>
                          ) : (
                            <Badge tone="warning">Verməyib</Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                        </span>
                        <span className="hidden text-[10px] text-slate-400 sm:block">
                          {item.deadline ? formatDateTime(item.deadline) : ''}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="h-7 w-7" />}
            title="Borcunuz yoxdur"
            description="Bütün tapşırıqları təhvil vermisiniz. Belə davam edin!"
            action={
              <Link to="/student/assignments">
                <Button variant="outline">Tapşırıqlara bax</Button>
              </Link>
            }
          />
        </Card>
      )}
    </div>
  )
}
