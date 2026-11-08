import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ClipboardList,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, Progress, Skeleton, StatCard } from '@/components/ui'
import { TeacherAssignmentCard } from '@/components/assignments/AssignmentUi'
import { getData } from '@/lib/api'
import { percent } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { StudentMissingSummary, TeacherDashboard, TeacherSubject } from '@/lib/types'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Sabahın xeyir'
  if (hour < 18) return 'Günortan xeyir'
  return 'Axşamın xeyir'
}

export default function TeacherDashboardPage() {
  const user = useAuthStore((state) => state.user)
  const dashboard = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => getData<TeacherDashboard>('/teacher/dashboard'),
  })
  const subjects = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => getData<TeacherSubject[]>('/teacher/subjects'),
  })
  const missing = useQuery({
    queryKey: ['teacher-missing-overview'],
    queryFn: () => getData<StudentMissingSummary[]>('/teacher/missing-overview'),
  })

  const data = dashboard.data
  const topMissing = (missing.data ?? []).slice(0, 6)
  const maxMissing = topMissing[0]?.count ?? 1

  return (
    <div className="page-container">
      <div className="relative mb-6 overflow-hidden rounded-3xl gradient-bg p-6 text-white shadow-soft sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-violet-900/25 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
              <Sparkles className="h-3.5 w-3.5" />
              Müəllim paneli
            </div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight sm:text-[34px]">
              {greeting()}, {user?.firstName ?? 'müəllim'}!
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Tapşırıqlarınızı idarə edin, təhvilləri izləyin və borclu tələbələri vaxtında görün.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/teacher/assignments/new">
              <Button
                variant="secondary"
                className="border-0 bg-white text-primary-700 hover:bg-white/90"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Yeni mövzu
              </Button>
            </Link>
            <Link to="/teacher/missing">
              <Button
                variant="ghost"
                className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
                leftIcon={<AlertTriangle className="h-4 w-4" />}
              >
                Borclular
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {dashboard.isError && (
        <Alert tone="danger" className="mb-4" title="Panel yüklənə bilmədi">
          <button className="font-semibold underline" onClick={() => void dashboard.refetch()}>
            Yenidən cəhd et
          </button>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {dashboard.isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="surface p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-12" />
              </div>
            ))
          : (
            <>
              <StatCard
                label="Aktiv mövzular"
                value={data?.activeAssignments ?? 0}
                hint="Arxivlənməmiş tapşırıqlar"
                icon={<ClipboardList className="h-5 w-5" />}
              />
              <StatCard
                label="Tələbələr"
                value={data?.students ?? 0}
                hint="Təyin olunmuş qruplarda"
                tone="violet"
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label="Verməyənlər"
                value={data?.missing ?? 0}
                hint="Bütün aktiv mövzular üzrə"
                tone={data && data.missing > 0 ? 'danger' : 'success'}
                icon={<AlertTriangle className="h-5 w-5" />}
              />
            </>
          )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Son mövzular</h2>
            <Link to="/teacher/assignments" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300">
              Hamısı
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
          ) : data?.recent.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recent.map((assignment) => (
                <TeacherAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  to={`/teacher/assignments/${assignment.id}`}
                />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<ClipboardList className="h-7 w-7" />}
                title="Hələ mövzu yoxdur"
                description="İlk tapşırığınızı yaradın və tələbələrlə paylaşın."
                action={
                  <Link to="/teacher/assignments/new">
                    <Button leftIcon={<Plus className="h-4 w-4" />}>Yeni mövzu yarat</Button>
                  </Link>
                }
              />
            </Card>
          )}

          <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Fənlərim və qruplarım</h2>
          </div>
          {subjects.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="surface space-y-3 p-5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : subjects.data?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {subjects.data.map((item) => (
                <div key={item.subject.id} className="surface p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.subject.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.groups.map((group) => (
                          <Badge key={group.id} tone="primary">
                            {group.code}
                          </Badge>
                        ))}
                        {!item.groups.length && <span className="text-[11px] text-slate-400">Qrup təyin olunmayıb</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={<BookOpen className="h-7 w-7" />}
                title="Fənn təyin olunmayıb"
                description="Admin tərəfindən fənn və qrup təyinatı gözlənilir."
              />
            </Card>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[#e5dfb4] px-5 py-4 dark:border-white/10">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Borclu tələbələr</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ən çox təhvil verməyənlər</p>
              </div>
              <Link to="/teacher/missing" className="rounded-lg p-1.5 text-primary-600 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-500/10" aria-label="Borclulara bax">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {missing.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
              </div>
            ) : topMissing.length ? (
              <ul className="divide-y divide-[#e5dfb4] dark:divide-white/[0.06]">
                {topMissing.map((student, index) => (
                  <li key={student.studentId} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e8e4c8] text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{student.studentName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {student.groupCode} · {student.count} borc
                        </p>
                        <Progress value={percent(student.count, maxMissing)} tone="danger" className="mt-1.5 h-1" />
                      </div>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{student.count}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<AlertTriangle className="h-7 w-7" />}
                title="Borclu yoxdur"
                description="Bütün tələbələr işlərini təhvil verib."
                className="py-8"
              />
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Qruplar</h2>
            <div className="mt-3 space-y-2">
              {data?.groups.length ? (
                data.groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between rounded-xl bg-[#efeada] px-3 py-2.5 dark:bg-white/[0.04]">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{group.name}</span>
                    <Badge tone="default">{group.studentCount} tələbə</Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Qrup tapılmadı.</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
