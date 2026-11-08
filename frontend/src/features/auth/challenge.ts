export interface OtpChallenge {
  challengeId: string
  maskedEmail?: string
  rememberDeviceAllowed?: boolean
}

const KEY = 'it25-otp-challenge'

export function saveOtpChallenge(challenge: OtpChallenge): void {
  sessionStorage.setItem(KEY, JSON.stringify(challenge))
}

export function readOtpChallenge(): OtpChallenge | null {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<OtpChallenge>
    if (!parsed.challengeId) return null
    return {
      challengeId: parsed.challengeId,
      maskedEmail: parsed.maskedEmail ?? '',
      rememberDeviceAllowed: Boolean(parsed.rememberDeviceAllowed),
    }
  } catch {
    return null
  }
}

export function clearOtpChallenge(): void {
  sessionStorage.removeItem(KEY)
}

export interface SetupFlow {
  flow: 'password-change' | 'email-setup'
  setupToken: string
}

const SETUP_KEY = 'it25-setup-flow'

export function saveSetupFlow(flow: string, setupToken: string): void {
  sessionStorage.setItem(SETUP_KEY, JSON.stringify({ flow, setupToken }))
}

export function readSetupFlow(): SetupFlow | null {
  const raw = sessionStorage.getItem(SETUP_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { flow?: string; setupToken?: string }
    if (!parsed.setupToken || (parsed.flow !== 'password-change' && parsed.flow !== 'email-setup')) return null
    return { flow: parsed.flow as SetupFlow['flow'], setupToken: parsed.setupToken }
  } catch {
    return null
  }
}

export function clearSetupFlow(): void {
  sessionStorage.removeItem(SETUP_KEY)
}
