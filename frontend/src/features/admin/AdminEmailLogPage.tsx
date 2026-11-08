import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Container, Row, Col, Table, Badge, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

import type { EmailLogRow } from '@/lib/types'
import { API_URL, apiFetch } from '@/lib/api'

export default function AdminEmailLogPage() {
  const accessToken = useAuthStore.getState().accessToken
  const { t } = useTranslation()

  const [page] = useState(1)
  const [size] = useState(30)

  const { data: emailData, isLoading } = useQuery({
    queryKey: ['admin-email-log', page, size],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      const response = await apiFetch(`${API_URL}/admin/email-log?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      return response.json()
    },
    refetchInterval: 60_000,
  })

  const emailRows = emailData?.data?.items as EmailLogRow[] | undefined
  const total = emailData?.data?.total ?? 0

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
            {t('admin.email_log')}
            <Badge
              tone="muted"
              className="ms-2 text-xs px-2 py-1"
            >
              {total}
            </Badge>
          </h2>
        </Col>
      </Row>

      {/* Email log table */}
      <Row className="mb-4">
        <Col md={12}>
          <Table responsive>
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.date')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.type')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.status')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.email')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold">{t('admin.user')}</th>
                <th className="text-left text-xs text-slate-500 dark:text-slate-400 fw-bold" style={{ width: '200px' }}>{t('admin.error')}</th>
              </tr>
            </thead>
            <tbody>
              {emailRows?.map((row, _idx) => (
                <tr key={row.id} className={cn('bg-white dark:bg-black/30', 'dark:bg-black/30', 'border-b', 'border-[#ddd6a8] dark:border-white/10')}>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {new Date(row.sent_at).toLocaleString('az-AZ')}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {row.type || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.status === 'sent' ? t('admin.sent') : row.status === 'failed' ? t('admin.failed') : t('admin.pending')}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.email || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.user_name || '—'}
                  </td>
                  <td className="text-xs text-slate-600 dark:text-slate-300">
                    {row.error || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {total === 0 && (
            <p className="text-center text-slate-500 mt-3">{t('admin.no_email_logs')}</p>
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