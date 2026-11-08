import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, Button, Field, Input } from '@/components/ui'
import { postData } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { AuthShell } from './AuthShell'
import { clearSetupFlow, readSetupFlow, saveSetupFlow } from './challenge'

export default function FirstPasswordChangePage() {
  const navigate = useNavigate()
  const [challenge] = useState(() => readSetupFlow())
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!challenge || challenge.flow !== 'password-change') {
      // No active setup session — redirect to login
      navigate('/login', { replace: true })
    }
  }, [challenge, navigate])

  if (!challenge) return null

  const isValid = password.length >= 8 && /[a-zA-ZəöüğışçĞ]/.test(password) && /\d/.test(password) && password === confirm

  const submit = async () => {
    if (!isValid) return
    setError(null)
    setLoading(true)
    try {
      const response = await postData<{ flow: string; setupToken: string | null }>(
        '/auth/first-password-change',
        { newPassword: password },
        { headers: { Authorization: `Bearer ${challenge.setupToken}` } },
      )
      if (response.flow === 'done') {
        clearSetupFlow()
        toast.success('Parol dəyişdirildi! Yenidən daxil olun.')
        navigate('/login', { replace: true })
        return
      }
      if (response.flow === 'email-setup' && response.setupToken) {
        saveSetupFlow(response.flow, response.setupToken)
        toast.success('Parol dəyişdirildi!')
        navigate('/auth/register-email', { replace: true })
        return
      }
      throw new Error('İzləmə halı alınmadı.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Parolunuzu dəyişin"
      subtitle="Bu hesab üçün ilkin giriş parolu hələ qüvvədədir. Davam etmək üçün parolu dəyişin."
      showBack={false}
    >
      <div className="space-y-4">
        {error && (
          <Alert tone="danger" title="Dəyişiklik alınmadı">
            {error}
          </Alert>
        )}

        <Field label="Yeni parol" htmlFor="new-password" required>
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Ən azı 8 simvol, hərf və rəqəm"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-lg p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Parolu gizlət' : 'Parolu göstər'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Field label="Parolu təsdiqləyin" htmlFor="confirm-password" required>
          <Input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Yenidən yazın"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="rounded-lg p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={showConfirm ? 'Parolu gizlət' : 'Parolu göstər'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        {confirm && password !== confirm && (
          <p className="text-xs text-rose-500">Parollar uyğun deyil.</p>
        )}

        <Button
          type="button"
          size="lg"
          className="mt-2 w-full"
          loading={loading}
          disabled={!isValid}
          onClick={submit}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Parolumu dəyiş
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Hesabınız dəyişdirildikdən sonra e-poçtunuzu təsdiqləmək üçün sizdən soruşulacaq.
        </p>
      </div>
    </AuthShell>
  )
}
