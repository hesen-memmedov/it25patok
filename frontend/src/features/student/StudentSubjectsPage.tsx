import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, AlertTriangle } from 'lucide-react'
import { Alert, Button, Card, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui'
import { getData } from '@/lib/api'
import { percent } from '@/lib/utils'
import type { StudentSubject } from '@/lib/types'

export default function StudentSubjectsPage() {
  const query = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => getData<StudentSubject[]>('/student/subjects'),
  })

  const totals = (query.data ?? []).reduce(
    (acc, subject) => ({
      total: acc.total + subject.total,
      submitted: acc.submitted + subject.submitted,
      missing: acc.missing + subject.missing,
    }),
    { total: 0, submitted: 0, missing: 0 },
  )

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Tələbə bölməsi"
        title="Fənlərim"
        description="Fənlər üzrə tapşırıqları, təhvil faizini və borclarınızı izləyin."
        actions={
          <Link to="/student/assignments">
            <Button variant="outline" leftIcon={<ClipboardList className="h-4 w-4" />}>
              Bütün tapşırıqlar
            </Button>
          </Link>
        }
      />

      {query.isError && (
        <Alert tone="danger" className="mb-4" title="Fənlər yüklənə bilmədi">
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Yenidən cəhd et
          </button>
        </Alert>
      )}

      {!query.isLoading && query.data && query.data.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ümumi tapşırıq</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.total}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Təhvil verib</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.submitted}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Verməyib</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.missing}</p>
            </div>
          </Card>
        </div>
      )}

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface space-y-4 p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : query.data?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {query.data.map((subject) => {
            const progress = percent(subject.submitted, subject.total)
            return (
              <Link
                key={subject.id}
                to={`/student/subjects/${subject.id}`}
                className="surface group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-glow dark:hover:border-primary-400/30"
              >
                <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary-50/80 blur-xl transition group-hover:bg-primary-100 dark:bg-primary-500/5" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 text-white shadow-soft">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" />
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold text-slate-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
                    {subject.name}
                  </h2>
                  {subject.code && <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{subject.code}</p>}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {subject.submitted}/{subject.total} təhvil
                      </span>
                      <span className="font-bold text-primary-600 dark:text-primary-300">{progress}%</span>
                    </div>
                    <Progress value={progress} tone={subject.missing > 0 ? 'warning' : 'success'} />
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">{subject.total} tapşırıq</span>
                    {subject.missing > 0 ? (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">{subject.missing} borc</span>
                    ) : (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Borc yoxdur</span>
                    )}
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
            title="Hələ fənn yoxdur"
            description="Müəllimləriniz tapşırıq paylaşanda fənlər burada görünəcək."
          />
        </Card>
      )}
    </div>
  )
}
