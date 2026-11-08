import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, SearchX } from 'lucide-react'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Pagination,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  Tabs,
} from '@/components/ui'
import { TeacherAssignmentCard } from '@/components/assignments/AssignmentUi'
import { getData } from '@/lib/api'
import type { Assignment, AssignmentType, PageResponse, TeacherSubject } from '@/lib/types'

type TypeFilter = 'ALL' | AssignmentType
type ArchiveFilter = 'active' | 'archived' | 'all'

const typeTabs: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Hamısı' },
  { value: 'SERBEST_ISH', label: 'Sərbəst' },
  { value: 'KOLLOKVIUM', label: 'Kollokvium' },
  { value: 'LABORATORIYA', label: 'Laboratoriya' },
]

export default function TeacherAssignmentsPage() {
  const [searchParams] = useSearchParams()
  const [type, setType] = useState<TypeFilter>('ALL')
  const [archive, setArchive] = useState<ArchiveFilter>('active')
  const [subject, setSubject] = useState(searchParams.get('subjectId') ?? '')
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

  const subjects = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => getData<TeacherSubject[]>('/teacher/subjects'),
  })

  const query = useQuery({
    queryKey: ['teacher-assignments', { type, archive, subject, search, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: '12' })
      if (type !== 'ALL') params.set('type', type)
      if (subject) params.set('subjectId', subject)
      if (search) params.set('search', search)
      if (archive !== 'all') params.set('archived', archive === 'archived' ? 'true' : 'false')
      return getData<PageResponse<Assignment>>(`/teacher/assignments?${params.toString()}`)
    },
    placeholderData: (previous) => previous,
  })

  return (
    <div className="page-container">
      <PageHeader
        eyebrow="Müəllim bölməsi"
        title="Mövzular"
        description="Yaratdığınız tapşırıqları idarə edin, filtrələyin və təhvilləri izləyin."
        actions={
          <Link to="/teacher/assignments/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Yeni mövzu</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Tabs
          items={typeTabs}
          value={type}
          onChange={(value) => {
            setType(value)
            setPage(1)
          }}
        />
        <Tabs
          size="sm"
          items={[
            { value: 'active', label: 'Aktiv' },
            { value: 'archived', label: 'Arxiv' },
            { value: 'all', label: 'Hamısı' },
          ]}
          value={archive}
          onChange={(value) => {
            setArchive(value)
            setPage(1)
          }}
          className="bg-transparent p-0 dark:bg-transparent"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
            {(subjects.data ?? []).map((item) => (
              <option key={item.subject.id} value={item.subject.id}>
                {item.subject.name}
              </option>
            ))}
          </Select>
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Mövzu axtar…" className="w-full sm:w-60" />
        </div>
      </div>

      {query.isError && (
        <Alert tone="danger" className="mb-4" title="Mövzular yüklənə bilmədi">
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Yenidən cəhd et
          </button>
        </Alert>
      )}

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="surface space-y-3 p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : query.data?.items.length ? (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{query.data.total}</span> mövzu
            </span>
            {query.isFetching && <span>Yenilənir…</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((assignment) => (
              <TeacherAssignmentCard
                key={assignment.id}
                assignment={assignment}
                to={`/teacher/assignments/${assignment.id}`}
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
            title={search ? 'Nəticə tapılmadı' : 'Mövzu yoxdur'}
            description={
              search
                ? 'Axtarış sözünü dəyişin və ya filtrləri sıfırlayın.'
                : 'İlk mövzunuzu yaradın və tələbələrlə paylaşın.'
            }
            action={
              !search && (
                <Link to="/teacher/assignments/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Yeni mövzu</Button>
                </Link>
              )
            }
          />
        </Card>
      )}
    </div>
  )
}
