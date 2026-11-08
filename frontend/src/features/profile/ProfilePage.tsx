import { useEffect, useState, useCallback, type ChangeEvent } from 'react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container, Row, Col, Input, Button, Label } from '@/components/ui'
import { useToast } from '@/lib/toast'
import { Moon, Sun } from 'lucide-react'

import { API_URL, apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AuthenticatedImage } from '@/components/ui'

export default function ProfilePage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const accessToken = useAuthStore((state) => state.accessToken)
  const navigate = useNavigate()
  const theme = useThemeStore((state) => state.theme)
  const setTheme = useThemeStore((state) => state.setTheme)
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [bio, setBio] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [emailChangeCode, setEmailChangeCode] = useState('')
  const [emailChangeChallengeId, setEmailChangeChallengeId] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [muted, setMuted] = useState(false)
  const [notificationEnabled, setNotificationEnabled] = useState(false)
  const [lockReason, setLockReason] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form values from user
  useEffect(() => {
    if (user) {
      setBio(user.bio || '')
      setEmail(user.email || '')
      setMuted(Boolean(user.mutedUntil && user.mutedUntil > Date.now()))
      setNotificationEnabled(user.notificationEnabled ?? true)
    }
  }, [user])

  // Update bio
  const updateBio = useCallback(
    async (newBio: string) => {
      setIsLoading(true)
      try {
        const response = await apiFetch(`${API_URL}/me/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ bio: newBio }),
        })
        const data = await response.json()
        if (response.ok) {
          setBio(newBio)
          useAuthStore.getState().setSession(data.user || user!, accessToken ?? "")
          toast({ title: 'Uğurlu', description: 'Biografiyamız yeniləndi.' })
        } else {
          toast({ title: 'Xəta', description: data.error?.message || 'Biografiya yenilenərkən xəta baş verdi.' })
        }
      } catch {
        toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
      } finally {
        setIsLoading(false)
      }
    },
    [user, accessToken, toast],
  )

  // Change email - request OTP
  const requestEmailChangeOtp = useCallback(
    async (newEmail: string) => {
      setIsLoading(true)
      try {
        const response = await apiFetch(`${API_URL}/me/email-change`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ newEmail }),
        })
        const data = await response.json()
        if (response.ok) {
          setEmailChangeChallengeId(data.challengeId)
          setShowEmailChange(true)
          toast({ title: 'OTP', description: 'Email dəyişmə OTP kodu göndərildi.' })
        } else {
          toast({ title: 'Xəta', description: data.error?.message || 'Xəta baş verdi.' })
        }
      } catch {
        toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, toast],
  )

  // Verify email change OTP
  const verifyEmailChangeOtp = useCallback(async () => {
    if (!emailChangeChallengeId) return
    setIsLoading(true)
    try {
      const response = await apiFetch(`${API_URL}/me/email-change/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ challengeId: emailChangeChallengeId, code: emailChangeCode }),
      })
      const data = await response.json()
      if (response.ok) {
        setShowEmailChange(false)
        setEmailChangeCode('')
        setEmailChangeChallengeId(null)
        useAuthStore.getState().setSession(data.user || user!, accessToken ?? "")
        setEmail(data.user?.email || email)
        toast({ title: 'Uğurlu', description: 'Email adresiniz yeniləndi.' })
      } else {
        toast({ title: 'Xəta', description: data.error?.message || 'OTP təsqirildikdən sonra xəta baş verdi.' })
      }
    } catch {
      toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
    } finally {
      setIsLoading(false)
    }
  }, [emailChangeChallengeId, emailChangeCode, user, accessToken, email, toast])

  // Change password
  const changePassword = useCallback(async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Xəta', description: 'Parolər uyğun deyil.' })
      return
    }
    setIsLoading(true)
    try {
      const response = await apiFetch(`${API_URL}/me/password-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ newPassword, oldPassword: password }),
      })
      const data = await response.json()
      if (response.ok) {
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordChange(false)
        useAuthStore.getState().setSession(data.user || user!, accessToken ?? "")
        toast({ title: 'Uğurlu', description: 'Parol qeyd edildi.' })
      } else {
        toast({ title: 'Xəta', description: data.error?.message || 'Parol yenilənirək xəta baş verdi.' })
      }
    } catch {
      toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
    } finally {
      setIsLoading(false)
    }
  }, [password, newPassword, confirmPassword, user, accessToken, toast])

  // Upload avatar
  const handleAvatarUpload = useCallback(
    async (file: File) => {
      setIsLoading(true)
      setAvatarFile(file)

      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const response = await apiFetch(`${API_URL}/me/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            // Multipart form data doesn't need Content-Type header set manually
          },
          body: formData,
        })
        const data = await response.json()
        if (response.ok) {
          useAuthStore.getState().setSession(data.user || user!, accessToken ?? "")
          setShowAvatarUpload(false)
          setAvatarFile(null)
          toast({ title: 'Uğurlu', description: 'Avatar yeniləndi.' })
        } else {
          toast({ title: 'Xəta', description: data.error?.message || 'Avatar yüklənirək xəta baş verdi.' })
        }
      } catch {
        toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
      } finally {
        setIsLoading(false)
      }
    },
    [user, accessToken, toast],
  )

  // Remove avatar
  const removeAvatar = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiFetch(`${API_URL}/me/avatar`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ remove: true }),
      })
      const data = await response.json()
      if (response.ok) {
        useAuthStore.getState().setSession(data.user || user!, accessToken ?? "")
        setShowAvatarUpload(false)
        setAvatarFile(null)
        toast({ title: 'Uğurlu', description: 'Avatar silindi.' })
      } else {
        toast({ title: 'Xəta', description: data.error?.message || 'Avatar silinərkən xəta baş verdi.' })
      }
    } catch {
      toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
    } finally {
      setIsLoading(false)
    }
  }, [user, accessToken, toast])

  // Handle file input change
  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (file) {
      setAvatarFile(file)
    }
  }, [])

  // Resend email change OTP
  const resendEmailChangeOtp = useCallback(async () => {
    if (!emailChangeChallengeId) return
    setIsLoading(true)
    try {
      const response = await apiFetch(`${API_URL}/me/email-change/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ challengeId: emailChangeChallengeId }),
      })
      const data = await response.json()
      if (response.ok) {
        setEmailChangeChallengeId(data.challengeId)
        toast({ title: 'OTP', description: 'Yeni OTP kodu göndərildi.' })
      } else {
        toast({ title: 'Xəta', description: data.error?.message || 'Xəta baş verdi.' })
      }
    } catch {
      toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
    } finally {
      setIsLoading(false)
    }
  }, [emailChangeChallengeId, accessToken, toast])

  // Check mute status
  useEffect(() => {
    if (user?.mutedUntil) {
      const isMuted = user.mutedUntil > Date.now()
      setMuted(isMuted)
      setLockReason(user.mutedUntil ? 'Hesabınız müüd edilib' : null)
    } else {
      setMuted(false)
      setLockReason(null)
    }
  }, [user])

  if (status !== 'authenticated' || !user) {
    return (
      <Container className="min-h-screen flex items-center justify-center py-8">
        <div className="py-8 text-center">
          <h1 className="display-4 mb-4">{t('auth.login_required')}</h1>
          <p className="lead text-muted-foreground">{t('auth.please_login')}</p>
        </div>
      </Container>
    )
  }

  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim()

  return (
    <Container className="min-h-screen py-4">
      <Row className="g-4">
        {/* Left sidebar with user info and settings */}
        <Col md={3} className="border-end border-[#ddd6a8] dark:border-white/10 h-fit p-4 flex flex-col">
          {/* User avatar */}
          <div className="mb-4 text-center">
            <AuthenticatedImage
              fileId={user.avatarFileId}
              alt={displayName}
              className="w-32 h-32 mx-auto rounded-full object-cover border border-[#ddd6a8] dark:border-white/10"
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-center"
              onClick={() => setShowAvatarUpload((value) => !value)}
            >
              {t('profile.change_avatar')}
            </Button>
            {showAvatarUpload && (
              <div className="mt-3 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-xs text-slate-500 dark:text-slate-400"
                />
                {avatarFile && (
                  <Button variant="primary" size="sm" onClick={() => handleAvatarUpload(avatarFile)} disabled={isLoading}>
                    {isLoading ? 'Yüklənir…' : t('common.upload')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mb-3">
            <Label htmlFor="bio">{t('profile.bio')}</Label>
            <Input
              id="bio"
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile.bio_placeholder')}
              className={cn(
                'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
                'resize-none',
              )}
            />
            <div className="mt-2">
              <Button
                variant="primary"
                size="sm"
                loading={isLoading}
                onClick={() => updateBio(bio)}
                disabled={isLoading}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>

          {/* Theme toggle */}
          <div className="mb-3">
            <Label>{t('profile.theme')}</Label>
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('profile.light')}</span>
              <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400 ml-2" />
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">{t('profile.dark')}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {t('profile.toggle_theme')}
            </Button>
          </div>

          {/* Notification settings */}
          <div className="mb-3">
            <Label className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {t('profile.notification_enabled')}
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                className="w-4 h-4 rounded border cursor-pointer"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">{t('profile.yes')}</span>
            </div>
          </div>

          {/* Email change section */}
          {showEmailChange && (
            <div className="mb-3">
              <Label>{t('profile.email_change')}</Label>
              {!emailChangeChallengeId ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {t('profile.email_change_prompt')}
                  </p>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder={t('profile.new_email')}
                    className={cn(
                      'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                      'text-sm',
                    )}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => setShowEmailChange(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => requestEmailChangeOtp(newEmail)}
                      disabled={!newEmail.includes('@') || isLoading}
                      loading={isLoading}
                    >
                      {t('profile.send_otp')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {t('profile.email_change_sent_to', { email })}
                  </p>
                  <Input
                    type="text"
                    value={emailChangeCode}
                    onChange={(e) => setEmailChangeCode(e.target.value)}
                    placeholder={t('profile.otp_code')}
                    className={cn(
                      'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                      'text-sm',
                    )}
                  />
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => setShowEmailChange(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={verifyEmailChangeOtp}
                      disabled={emailChangeCode.length !== 6}
                    >
                      {t('profile.verify')}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-sm text-slate-500 dark:text-slate-400"
                    onClick={resendEmailChangeOtp}
                  >
                    {t('profile.resend_otp')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Password change section */}
          {showPasswordChange && (
            <div>
              <Label>{t('profile.password_change')}</Label>
              <Input
                type="password"
                placeholder={t('profile.current_password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                  'text-sm',
                  'mb-2',
                )}
              />
              <Input
                type="password"
                placeholder={t('profile.new_password')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                  'text-sm',
                  'mb-2',
                )}
              />
              <Input
                type="password"
                placeholder={t('profile.confirm_password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                  'text-sm',
                )}
              />
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowPasswordChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={changePassword}
                  disabled={!password || !newPassword || !confirmPassword}
                >
                  {t('profile.change_password')}
                </Button>
              </div>
            </div>
          )}

          {/* Mute info */}
          {muted && (
            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              {t('profile.account_muted', { reason: lockReason || '' })}
            </div>
          )}
        </Col>

        {/* Main content */}
        <Col md={9} className="p-4">
          {/* Account stats or general info */}
          <Row className="mb-4">
            <Col>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('profile.my_profile')}</h2>
            </Col>
          </Row>

          {/* Account info cards */}
          <Row className="g-4 mb-4">
            <Col sm={6}>
              <div className="p-3 rounded-lg bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('profile.account_joined')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(user.createdAt).toLocaleDateString('az-AZ')}
                </p>
              </div>
            </Col>
            <Col sm={6}>
              <div className="p-3 rounded-lg bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('profile.last_login')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('az-AZ') : t('profile.never')}
                </p>
              </div>
            </Col>
          </Row>

          {/* Recent activity / summary */}
          <div className="rounded-lg bg-white dark:bg-black/30 dark:bg-black/30 border border-[#ddd6a8] dark:border-white/10 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('profile.account_settings')}</h3>
            <div className="space-y-3">
              {/* Bio editor */}
              <div>
                <Label>{t('profile.bio')}</Label>
                <Input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('profile.enter_bio')}
                  className={cn(
                    'w-full rounded-lg border border-[#ddd6a8] dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                    'text-sm',
                    'resize-none',
                  )}
                />
              </div>

              {/* Theme preference (already shown above) */}
              {/* Notification toggle (already shown above) */}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 pt-4 border-t border-[#ddd6a8] dark:border-white/10">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">{t('profile.actions')}</h3>

            <Button
              variant="ghost"
              className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white mb-2"
              onClick={() => navigate('/settings')}
            >
              {t('profile.settings')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswordChange(true)}
            >
              {t('profile.change_password')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailChange(true)}
            >
              {t('profile.change_email')}
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={removeAvatar}
            >
              {t('profile.remove_avatar')}
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  )
}
