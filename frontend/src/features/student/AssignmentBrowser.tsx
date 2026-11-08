import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, SearchX } from 'lucide-react'
import { Alert, Card, EmptyState, Pagination, SearchInput, Select, Skeleton, Tabs } from '@/components/ui'
import { AssignmentCard } from '@/components/assignments/AssignmentUi'
import { getData } from '@/lib/api'
import type { Assignment, AssignmentType, PageResponse, StudentSubject } from '@/lib/types'

type TypeFilter = 'ALL' | AssignmentType

const typeTabs: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Hamısı' },
  { value: 'SERBEST_ISH', label: 'Sərbəst işlər' },
  { value: 'KOLLOKVIUM', label: 'Kollokviumlar' },
  { value: 'LABORATORIYA', label: 'Laboratoriya' },
]

export function AssignmentBrowser({
  subjectId,
  subjects,
}: {
  subjectId?: string
  subjects?: StudentSubject[]
}) {
  const [searchParams] = useSearchParams()
  const [type, setType] = useState<TypeFilter>('ALL')
  const [subject, setSubject] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const param = searchParams.get('search') ?? ''
    if (param !== search) {
      setSearchInput(param)
      setSearch(param)
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const effectiveSubject = subjectId ?? subject

  const query = useQuery({
    queryKey: ['student-assignments', { effectiveSubject, type, search, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: '12' })
      if (effectiveSubject) params.set('subjectId', effectiveSubject)
      if (type !== 'ALL') params.set('type', type)
      if (search) params.set('search', search)
      return getData<PageResponse<Assignment>>(`/student/assignments?${params.toString()}`)
    },
    placeholderData: (previous) => previous,
  })

  const changeType = (value: TypeFilter) => {
    setType(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Tabs items={typeTabs} value={type} onChange={changeType} className="max-w-full" />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {!subjectId && subjects && subjects.length > 0 && (
            <Select
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                setPage(1)
              }}
              className="w-[190px]"
              aria-label="Fənn üzrə filter"
            >
              <option value="">Bütün fənlər</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          )}
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Tapşırıq axtar…"
            className="w-full sm:w-60"
          />
        </div>
      </div>

      {query.isError && (
        <Alert tone="danger" title="Tapşırıqlar yüklənə bilmədi">
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Yenidən cəhd et
          </button>
        </Alert>
      )}

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="surface space-y-3 p-5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-3 h-3 w-44" />
            </div>
          ))}
        </div>
      ) : query.data?.items.length ? (
        <>
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{query.data.total}</span> tapşırıq tapıldı
            </span>
            {query.isFetching && <span className="text-[11px]">Yenilənir…</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                to={`/student/assignments/${assignment.id}`}
              />
            ))}
          </div>
          <Pagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            total={query.data.total}
            onChange={setPage}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            icon={search ? <SearchX className="h-7 w-7" /> : <ClipboardList className="h-7 w-7" />}
            title={search ? 'Nəticə tapılmadı' : 'Tapşırıq yoxdur'}
            description={
              search
                ? 'Axtarış sözünü dəyişin və ya filtrləri sıfırlayın.'
                : 'Bu bölmə üzrə hələ tapşırıq paylaşılmayıb. Yeni tapşırıqlar burada görünəcək.'
            }
          />
        </Card>
      )}
    </div>
  )
}
