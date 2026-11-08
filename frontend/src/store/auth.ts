import { create } from 'zustand'
import type { User } from '@/lib/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  user: User | null
  accessToken: string | null
  status: AuthStatus
  setSession: (user: User, accessToken: string) => void
  setUser: (user: User) => void
  setAnonymous: () => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: 'loading',
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  setAnonymous: () => set({ user: null, accessToken: null, status: 'anonymous' }),
  clear: () => set({ user: null, accessToken: null, status: 'anonymous' }),
}))

export function currentUser(): User | null {
  return useAuthStore.getState().user
}
