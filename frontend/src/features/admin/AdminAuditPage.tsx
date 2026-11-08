import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Container, Row, Col, Table, Button, Badge, Input, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

import type { AuditRow } from '@/lib/types'
import { API_URL, apiFetch } from '@/lib/api'

export default function AdminAuditPage() {
  const { t } = useTranslation()
  const accessToken = useAuthStore.getState().accessToken

  const [page, setPage] = useState(1)
  const [size] = useState(30)
  const [actionFilter, setActionFilter] = useState<string>('')

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['admin-audit', page, size, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      if (actionFilter) params.set('action', actionFilter)
      const response = await apiFetch(`${API_URL}/admin/audit-log?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    refetchInterval: 60_000,
  })

  const auditRows = auditData?.data?.items as AuditRow[] | undefined
  const total = auditData?.data?.total ?? 0

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
            {t('admin.audit_log')}
            <Badge
              tone="muted"
              className="ms-2 text-xs px-2 py-1"
            >
              {total}
            </Badge>
          </h2>
        </Col>
      </Row>

      {/* Action filter */}
      <Row className="mb-4">
        <Col md={4} sm={6}>
          <Input
            type="text"
            placeholder={t('admin.filter_action')}
            value={actionFilter || ''}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className={cn(
              'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
              'text-sm',
            )}
          />
        </Col>
        <Col md={3} sm={4}>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-slate-600 dark:text-slate-300"
            onClick={() => setActionFilter('')}
          >
            {t('common.clear')}
          </Button>
        </Col>
      </Row>

      {/* Audit table */}
      <Row className="mb-4">
        <Col md={12}>
          <Table responsive>
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.date')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.action')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.target_type')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.target_id')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.actor')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.actor_email')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '140px' }}>{t('admin.ip')}</th>
              </tr>
            </thead>
            <tbody>
              {auditRows?.map((row, _idx) => (
                <tr key={row.id} className={cn('bg-white dark:bg-black/30', 'dark:bg-black/30', 'border-b', 'border-[#ddd6a8] dark:border-white/10')}>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {new Date(row.created_at).toLocaleString('az-AZ')}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {row.action || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.target_type || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.target_id ? row.target_id.substring(0, 8) + '…' : '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.actor_name || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.actor_email || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.ip || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {total === 0 && (
            <p className="text-center text-slate-500 mt-3">{t('admin.no_audit_entries')}</p>
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