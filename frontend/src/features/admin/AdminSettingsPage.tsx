import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import { Container, Row, Col, Input, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/toast'
import { API_URL, apiFetch } from '@/lib/api'

export default function AdminSettingsPage() {
  const { t } = useTranslation()
  const accessToken = useAuthStore.getState().accessToken
  const toast = useToast()

  const [dailyEmailTime, setDailyEmailTime] = useState<string>('09:00')
  const [smtpHost, setSmtpHost] = useState<string>('')
  const [smtpPort, setSmtpPort] = useState<number | null>(null)
  const [smtpUser, setSmtpUser] = useState<string>('')
  const [smtpPassword, setSmtpPassword] = useState<string>('')
  const [d1Mode, setD1Mode] = useState<'local' | 'cloudflare'>('local')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const savedMode = localStorage.getItem('d1_mode')
    if (savedMode) {
      setD1Mode(savedMode as 'local' | 'cloudflare')
    }
  }, [])

  const saveSettings = () => async () => {
    setIsLoading(true)
    try {
      const response = await apiFetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          daily_email_time: dailyEmailTime,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_password: smtpPassword,
          d1_mode: d1Mode,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        localStorage.setItem('d1_mode', d1Mode)
        toast({ title: 'Uğurlu', description: 'Ayarlardan yeniləndi.' })
      } else {
        toast({ title: 'Xəta', description: data.error?.message || 'Ayarlar yenilenərkən xəta baş verdi.' })
      }
    } catch {
      toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container className="min-h-screen py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {t('admin.settings')}
          </h2>
        </Col>
      </Row>

      {/* D1 Mode setting */}
      <Row className="mb-4">
        <Col md={6}>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.d1_mode')}</span>
            <Input
              value={d1Mode}
              onChange={(e) => setD1Mode(e.target.value as 'local' | 'cloudflare')}
              className={cn(
                'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
              readOnly
            />
          </div>
        </Col>
      </Row>

      {/* Daily email time setting */}
      <Row className="mb-4">
        <Col md={6}>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.daily_email_time')}</span>
            <Input
              type="time"
              value={dailyEmailTime}
              onChange={(e) => setDailyEmailTime(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('admin.daily_email_time_tooltip', { time: dailyEmailTime })}
            </span>
          </div>
        </Col>
      </Row>

      {/* SMTP settings */}
      <Row className="mb-4">
        <Col md={6}>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.smtp_host')}</span>
            <Input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder={t('admin.smtp_host_placeholder')}
              className={cn(
                'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
            />
          </div>
        </Col>
        <Col md={6}>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.smtp_port')}</span>
            <Input
              type="number"
              value={smtpPort?.toString() || ''}
              onChange={(e) => setSmtpPort(Number(e.target.value) || null)}
              placeholder={t('admin.smtp_port_placeholder')}
              className={cn(
                'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
            />
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.smtp_user')}</span>
            <Input
              type="text"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder={t('admin.smtp_user_placeholder')}
              className={cn(
                'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
            />
          </div>
        </Col>
        <Col md={6}>
          <div className="bg-white dark:bg-black/30 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-lg p-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{t('admin.smtp_password')}</span>
            <Input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              placeholder={t('admin.smtp_password_placeholder')}
              className={cn(
                'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
            />
          </div>
        </Col>
      </Row>

      {/* Save button */}
      <Row className="mt-6">
        <Col md={12} className="text-center">
          <Button
            variant="primary"
            onClick={saveSettings}
            disabled={isLoading}
            className="w-auto"
          >
            {isLoading ? 'Yenilənir...' : t('admin.save_settings')}
          </Button>
        </Col>
      </Row>
    </Container>
  )
}