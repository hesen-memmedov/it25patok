import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, UserRound } from 'lucide-react'
import { Alert, Button, Field, Input } from '@/components/ui'
import { login } from '@/lib/api'
import { errorMessage, roleHome } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { AuthShell } from './AuthShell'
import { saveOtpChallenge, saveSetupFlow } from './challenge'

const schema = z.object({
  identifier: z.string().min(1, 'İstifadəçi adı və ya e-poçt tələb olunur').max(254),
  password: z.string().min(1, 'Parol tələb olunur'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => login(values.identifier.trim().toLowerCase(), values.password),
    onSuccess: (data) => {
      // 1) Hesab yaradılıb, amma parol hələ dəyişdirilməyib → məcburi parol dəyişmə
      if (data.flow === 'password-change' && data.setupToken) {
        saveSetupFlow(data.flow, data.setupToken)
        navigate('/auth/first-password-change', { replace: true })
        return
      }
      // 2) Parol dəyişdirilib, amma e-poçt hələ qeyd edilməyib → e-poçt qeydiyyatı
      if (data.flow === 'email-setup' && data.setupToken) {
        saveSetupFlow(data.flow, data.setupToken)
        navigate('/auth/register-email', { replace: true })
        return
      }
      // 3) Etibarlı cihaz varsa, birbaşa daxil ol
      if (data.accessToken && data.user) {
        setSession(data.user, data.accessToken)
        navigate(roleHome(data.user.role), { replace: true })
        return
      }
      // 4) E-poçta birdəfəlik kod göndərildi
      if (data.challengeId) {
        saveOtpChallenge({
          challengeId: data.challengeId,
          maskedEmail: data.maskedEmail ?? '',
          rememberDeviceAllowed: data.rememberDeviceAllowed,
        })
        navigate('/login/otp')
      }
    },
  })

  return (
    <AuthShell
      title="Hesabınıza daxil olun"
      subtitle="Admin tərəfindən verilmiş istifadəçi adı və parolunuzla daxil olun. İlk girişdə parolu dəyişəcək və e-poçtunuzu təsdiqləyəcəksiniz."
      showBack={false}
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        {mutation.isError && (
          <Alert tone="danger" title="Giriş alınmadı">
            {errorMessage(mutation.error)}
          </Alert>
        )}

        <Field label="İstifadəçi adı və ya e-poçt" htmlFor="identifier" error={errors.identifier?.message} required>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ad.soyad və ya ad@gmail.com"
            leftIcon={<UserRound className="h-4 w-4" />}
            invalid={Boolean(errors.identifier)}
            {...register('identifier')}
          />
        </Field>

        <Field label="Parol" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            leftIcon={<Lock className="h-4 w-4" />}
            invalid={Boolean(errors.password)}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-lg p-2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Parolu gizlət' : 'Parolu göstər'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />
        </Field>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={mutation.isPending}>
          Davam et
        </Button>

        <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Hesabınız yoxdur? <span className="font-semibold text-slate-700 dark:text-slate-300">Hesabı yalnız admin yaradır.</span>
        </p>

        {import.meta.env.DEV && (
          <div className="rounded-xl border border-dashed border-[#cfc799] bg-[#efeada] p-3 text-[11px] leading-5 text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Lokal test hesabı:</span>{' '}
            admin / Admin123!IT25
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Girişlə bağlı problem yaranarsa, adminə müraciət edin. <Link to="/login" className="font-semibold text-primary-500 hover:underline">Yenidən cəhd et</Link>
      </p>
    </AuthShell>
  )
}
