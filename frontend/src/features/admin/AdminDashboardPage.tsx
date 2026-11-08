import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import { Container, Badge } from '@/components/ui'

import type { AdminStats, DashboardSummary } from '@/lib/types'
import { API_URL, apiFetch } from '@/lib/api'

export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () =>
      apiFetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-dashboard-summary'],
    queryFn: () =>
      apiFetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json()),
    refetchInterval: 60_000,
  })

  const stats = statsData?.data as AdminStats | undefined
  const summary = summaryData?.data as DashboardSummary | undefined

  if (isLoading || summaryLoading) {
    return (
      <Container className="min-h-screen flex items-center justify-center py-8">
        <div className="min-h-[300px] flex items-center justify-center text-slate-900 dark:text-white">
          <span>{t('admin.loading')}</span>
        </div>
      </Container>
    )
  }

  return (
    <Container className="min-h-screen py-4">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('admin.dashboard')}</h2>
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {stats && (
          <>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.students')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.students}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.students_tooltip')}
                </Badge>
              </div>
            </div>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.teachers')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.teachers}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.teachers_tooltip')}
                </Badge>
              </div>
            </div>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.admins')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.admins}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.admins_tooltip')}
                </Badge>
              </div>
            </div>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.assignments')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.assignments}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.assignments_tooltip')}
                </Badge>
              </div>
            </div>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.submissions')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.submissions}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.submissions_tooltip')}
                </Badge>
              </div>
            </div>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.files')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.files}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.files_tooltip')}
                </Badge>
              </div>
            </div>
            <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4 hover:transition-all hover:border-primary-300">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('admin.storage')}</h3>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{formatBytes(stats?.storageBytes || 0)}</p>
                </div>
                <Badge tone="muted" className="text-xs">
                  {t('admin.storage_tooltip')}
                </Badge>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.recent_activity')}</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.users} {t('admin.users')}</p>
          </div>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.assignments')}</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.assignments} {t('admin.assignments_plural')}</p>
          </div>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.missing')}</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.missing} {t('admin.missing_items')}</p>
          </div>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.chat_messages')}</h4>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.chatMessages} {t('admin.messages')}</p>
          </div>
        </div>
      )}

      {/* Recent audit log */}
      <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{t('admin.recent_audit')}</h4>
        {summary && summary.recentAudit?.length > 0 ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {summary.recentAudit.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-md bg-white dark:bg-black/30 dark:bg-black/30"
              >
                <span className="text-xs text-slate-500 dark:text-slate-400">{row.action || '—'}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{row.target_type || '—'}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(row.created_at).toLocaleString('az-AZ')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">{t('admin.no_audit_entries')}</p>
        )}
      </div>
    </Container>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
