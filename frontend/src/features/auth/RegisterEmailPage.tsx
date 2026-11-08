import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, Button, Field, Input } from '@/components/ui'
import { postData } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { AuthShell } from './AuthShell'
import { clearSetupFlow, readSetupFlow, saveOtpChallenge } from './challenge'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function RegisterEmailPage() {
  const navigate = useNavigate()
  const [challenge] = useState(() => readSetupFlow())
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!challenge || challenge.flow !== 'email-setup') {
      navigate('/login', { replace: true })
    }
  }, [challenge, navigate])

  if (!challenge) return null

  const trimmed = email.trim().toLowerCase()
  const isValid = EMAIL_RE.test(trimmed)

  const submit = async () => {
    if (!isValid) return
    setError(null)
    setLoading(true)
    try {
      const response = await postData<{ flow: string; challengeId: string; maskedEmail: string }>(
        '/auth/register-email',
        { email: trimmed },
        { headers: { Authorization: `Bearer ${challenge.setupToken}` } },
      )
      if (response.flow === 'otp' && response.challengeId) {
        clearSetupFlow()
        saveOtpChallenge({
          challengeId: response.challengeId,
          maskedEmail: response.maskedEmail ?? '',
          rememberDeviceAllowed: false,
        })
        toast.success('Kod e-poçtunuza göndərildi!')
        navigate('/login/otp', { replace: true })
        return
      }
      throw new Error('Növbəti addım alınmadı.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="E-poçtunuzu qeyd edin"
      subtitle="Hesabınızı təsdiqləmək üçün həqiqi e-poçt ünvanınızı (məs: ad@gmail.com) yazın. Bu ünvana birdəfəlik kod göndəriləcək."
      showBack={false}
    >
      <div className="space-y-4">
        {error && (
          <Alert tone="danger" title="E-poçt qeyd edilmədi">
            {error}
          </Alert>
        )}

        <Field label="E-poçt ünvanı" htmlFor="register-email" required>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="ad@gmail.com"
            leftIcon={<Mail className="h-4 w-4" />}
            invalid={Boolean(error)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        </Field>

        <Button
          type="button"
          size="lg"
          className="mt-2 w-full"
          loading={loading}
          disabled={!isValid}
          onClick={submit}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Təsdiq kodu göndər
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Bu e-poçt hesabınızın giriş ünvanı olacaq. Sonrakı girişlərdə bu ünvan ilə parol istifadə edəcəksiniz.
        </p>
      </div>
    </AuthShell>
  )
}
