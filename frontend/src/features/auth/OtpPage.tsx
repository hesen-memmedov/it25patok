import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Clock3, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, Button, Checkbox } from '@/components/ui'
import { resendOtp, verifyOtp } from '@/lib/api'
import { errorMessage, roleHome } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { AuthShell } from './AuthShell'
import { clearOtpChallenge, readOtpChallenge, saveOtpChallenge } from './challenge'

interface VerifyVariables {
  id: string
  code: string
  remember: boolean
}

export default function OtpPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const initial = useMemo(() => readOtpChallenge(), [])
  const [challenge, setChallenge] = useState(initial)
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [remember, setRemember] = useState(false)
  const [seconds, setSeconds] = useState(60)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

  const verifyMutation = useMutation({
    mutationFn: ({ id, code, remember }: VerifyVariables) => verifyOtp(id, code, remember),
    onSuccess: (data) => {
      if (data.accessToken && data.user) {
        clearOtpChallenge()
        setSession(data.user, data.accessToken)
        toast.success(`Xoş gəldiniz, ${data.user.firstName}!`)
        navigate(roleHome(data.user.role), { replace: true })
        return
      }
      if (data.challengeId) {
        const next = {
          challengeId: data.challengeId,
          maskedEmail: data.maskedEmail ?? '',
          rememberDeviceAllowed: data.rememberDeviceAllowed,
        }
        setChallenge(next)
        saveOtpChallenge(next)
      }
    },
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => resendOtp(id),
    onSuccess: (data) => {
      if (!challenge) return
      const next = { ...challenge, challengeId: data.challengeId }
      setChallenge(next)
      saveOtpChallenge(next)
      setSeconds(60)
      setDigits(['', '', '', '', '', ''])
      toast.success('Yeni təsdiq kodu göndərildi.')
      inputs.current[0]?.focus()
    },
  })

  if (!challenge) return <Navigate to="/login" replace />

  const code = digits.join('')
  const error = verifyMutation.error ?? resendMutation.error

  const setDigit = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '').slice(-1)
    setDigits((current) => {
      const next = [...current]
      next[index] = value
      return next
    })
    verifyMutation.reset()
    if (value && index < 5) inputs.current[index + 1]?.focus()
  }

  const handlePaste = (text: string) => {
    const chars = text.replace(/\D/g, '').slice(0, 6).split('')
    if (!chars.length) return
    const next = ['', '', '', '', '', '']
    chars.forEach((char, index) => {
      next[index] = char
    })
    setDigits(next)
    verifyMutation.reset()
    const focusIndex = Math.min(chars.length, 5)
    inputs.current[focusIndex]?.focus()
  }

  const submit = () => {
    if (code.length !== 6 || verifyMutation.isPending) return
    verifyMutation.mutate({ id: challenge.challengeId, code, remember })
  }

  return (
    <AuthShell
      title="E-poçtunuzu təsdiqləyin"
      subtitle={
        <>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{challenge.maskedEmail || 'E-poçtunuz'}</span>{' '}
          ünvanına 6 rəqəmli təsdiq kodu göndərdik. Kod 5 dəqiqə etibarlıdır.
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 rounded-xl border border-primary-100 bg-primary-50/70 px-3.5 py-3 text-xs text-primary-700 dark:border-primary-400/15 dark:bg-primary-500/10 dark:text-primary-200">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Kodu heç kimlə paylaşmayın. İT25 PATOK heç vaxt kodu telefonla istəməz.
        </div>

        {error && (
          <Alert tone="danger" title="Təsdiq alınmadı">
            {errorMessage(error)}
          </Alert>
        )}

        <div>
          <label className="mb-2 block text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            Təsdiq kodu
          </label>
          <div className="grid grid-cols-6 gap-2" onPaste={(event) => {
            event.preventDefault()
            handlePaste(event.clipboardData.getData('text'))
          }}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element
                }}
                value={digit}
                onChange={(event) => setDigit(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus()
                  }
                  if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
                  if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus()
                  if (event.key === 'Enter') submit()
                }}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                pattern="\d*"
                aria-label={`Kod rəqəmi ${index + 1}`}
                className="h-14 w-full rounded-xl border border-[#ddd6a8] bg-white text-center text-xl font-bold text-slate-900 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            ))}
          </div>
        </div>

        {challenge.rememberDeviceAllowed && (
          <Checkbox
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            label="Bu cihazı 30 gün yadda saxla — növbəti girişlərdə OTP tələb olunmasın"
          />
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          loading={verifyMutation.isPending}
          disabled={code.length !== 6}
          onClick={submit}
        >
          Təsdiqlə və daxil ol
        </Button>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={seconds > 0 || resendMutation.isPending}
            onClick={() => resendMutation.mutate(challenge.challengeId)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 transition hover:text-primary-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-primary-300 dark:disabled:text-slate-500"
          >
            <Clock3 className="h-3.5 w-3.5" />
            {resendMutation.isPending
              ? 'Göndərilir…'
              : seconds > 0
                ? `Yenidən göndər (${seconds}s)`
                : 'Kodu yenidən göndər'}
          </button>
          <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
            E-poçtu dəyiş
          </Link>
        </div>

        <p className="text-center text-[11px] leading-5 text-slate-400">
          Kod gəlmirsə spam qovluğunu yoxlayın və ya 60 saniyə sonra yenidən göndərin. Saatda maksimum 5 kod göndərilir.
        </p>
      </div>
    </AuthShell>
  )
}
