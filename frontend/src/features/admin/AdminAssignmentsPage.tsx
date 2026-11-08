import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Container, Row, Col, Table, Button, Badge, Input, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

import type { Assignment } from '@/lib/types'
import { API_URL, apiFetch } from '@/lib/api'

export default function AdminAssignmentsPage() {
  const { t } = useTranslation()
  const accessToken = useAuthStore.getState().accessToken

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [size] = useState(20)

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ['admin-assignments', search, page, size],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      if (search) params.set('search', search)
      const response = await apiFetch(`${API_URL}/admin/assignments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    refetchInterval: 60_000,
  })

  const assignments = assignmentsData?.data?.items as Assignment[] | undefined
  const total = assignmentsData?.data?.total ?? 0

  if (isLoading) {
    return (
      <Container py-8>
        <Row className="align-items-center justify-content-center h-72">
          <Col>
            <Spinner className="mx-auto mb-4" />
            <p>{t('admin.loading')}</p>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container className="min-h-screen py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {t('admin.assignments')}
            <Badge
              tone="muted"
              className="ms-2 text-xs px-2 py-1"
            >
              {total}
            </Badge>
          </h2>
        </Col>
      </Row>

      {/* Search and filters */}
      <Row className="mb-4 g-3">
        <Col md={4} sm={6}>
          <Input
            type="text"
            placeholder={t('admin.search_assignments')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className={cn(
              'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
              'text-sm',
            )}
          />
        </Col>
        <Col md={3} sm={4}>
          <Input
            type="text"
            placeholder={t('admin.type')}
            value={''}
            className={cn(
              'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
              'text-sm',
            )}
          />
        </Col>
        <Col md={3} sm={4}>
          <Input
            type="checkbox"
            checked={false}
            onChange={() => {}}
            className="w-4 h-4 rounded border cursor-pointer me-1"
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {t('admin.active_only')}
          </span>
        </Col>
        <Col md={2} sm={4}>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-slate-600 dark:text-slate-300"
            onClick={() => setSearch('')}
          >
            {t('common.clear')}
          </Button>
        </Col>
      </Row>

      {/* Assignments table */}
      <Row className="mb-4">
        <Col md={12}>
          <Table responsive>
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.title')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.type')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.teacher')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.groups')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.submitted')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.deadline')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '120px' }}>{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {assignments?.map((a, _idx) => (
                <tr key={a.id} className={cn('bg-white dark:bg-black/30', 'dark:bg-black/30', 'border-b', 'border-slate-200 dark:border-white/10')}>
                  <td className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                    {a.title}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    <Badge
                      tone={a.type === 'SERBEST_ISH' ? 'primary' : a.type === 'KOLLOKVIUM' ? 'warning' : 'success'}
                      className="text-xs px-2 py-0.5"
                    >
                      {a.type}
                    </Badge>
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">{a.teacherName || t('admin.none')}</td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {a.groupCodes?.join(', ') || t('admin.none')}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {a.submittedCount} / {a.attachmentCount || a.submittedCount}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {a.deadline ? new Date(a.deadline).toLocaleString('az-AZ') : t('admin.no_deadline')}
                  </td>
                  <td className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-600 dark:text-slate-300"
                    >
                      {t('admin.view')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-600 dark:text-slate-300 mx-1"
                    >
                      {t('admin.edit')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="text-xs text-rose-300"
                    >
                      {t('admin.delete')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {total === 0 && (
            <p className="text-center text-slate-500 mt-3">{t('admin.no_assignments')}</p>
          )}
        </Col>
      </Row>

      {/* Pagination */}
      {total > size && (
        <Row className="mt-4 justify-content-center">
          <Col md={12} lg={6}>
            <nav aria-label="Page navigation">
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {t('admin.page', {
                    page,
                    totalPages: Math.ceil(total / size),
                  })}&nbsp;of&nbsp;{Math.ceil(total / size)}
                </span>
                <span>
                  {t('admin.showing', {
                    start: (page - 1) * size + 1,
                    end: Math.min(page * size, total),
                    total,
                  })}&nbsp;{t('admin.records')}
                </span>
              </div>
            </nav>
          </Col>
        </Row>
      )}
    </Container>
  )
}