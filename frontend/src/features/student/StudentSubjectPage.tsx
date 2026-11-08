import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Card, EmptyState, PageHeader, Progress, Skeleton } from '@/components/ui'
import { getData } from '@/lib/api'
import { percent } from '@/lib/utils'
import type { StudentSubject } from '@/lib/types'
import { AssignmentBrowser } from './AssignmentBrowser'

export default function StudentSubjectPage() {
  const { subjectId = '' } = useParams()
  const subjects = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => getData<StudentSubject[]>('/student/subjects'),
  })
  const subject = subjects.data?.find((item) => item.id === subjectId)
  const progress = subject ? percent(subject.submitted, subject.total) : 0

  return (
    <div className="page-container">
      <Link
        to="/student/subjects"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Fənlərə qayıt
      </Link>

      {subjects.isLoading ? (
        <div className="surface mb-5 space-y-3 p-6">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-3 w-72" />
          <Skeleton className="h-2 w-full max-w-md" />
        </div>
      ) : subject ? (
        <div className="relative mb-5 overflow-hidden rounded-3xl border border-primary-100/70 bg-gradient-to-br from-white via-primary-50/30 to-violet-50/40 p-6 shadow-sm dark:border-primary-400/10 dark:from-white/[0.05] dark:via-primary-500/5 dark:to-violet-500/5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary-100/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                <BookOpen className="h-3 w-3" />
                Fənn
              </div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {subject.name}
              </h1>
              {subject.description && (
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subject.description}</p>
              )}
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {subject.submitted}/{subject.total} təhvil
                </span>
                <span className="font-bold text-primary-600 dark:text-primary-300">{progress}%</span>
              </div>
              <Progress value={progress} tone={subject.missing > 0 ? 'warning' : 'success'} className="mt-2" />
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                {subject.missing > 0 ? `${subject.missing} təhvil verilməmiş iş` : 'Bütün işlər təhvil verilib'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <PageHeader title="Fənn" description="Bu fənn üzrə tapşırıqlar" />
      )}

      {subject && subject.total === 0 ? (
        <Card>
          <EmptyState
            icon={<BookOpen className="h-7 w-7" />}
            title="Bu fənn üzrə tapşırıq yoxdur"
            description="Yeni tapşırıq paylaşılanda avtomatik burada görünəcək."
          />
        </Card>
      ) : (
        <AssignmentBrowser subjectId={subjectId} />
      )}
    </div>
  )
}
