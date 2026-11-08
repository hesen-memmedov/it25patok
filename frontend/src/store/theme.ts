import { create } from 'zustand'
import type { Theme } from '@/lib/types'

const STORAGE_KEY = 'it25-theme'

type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme
}

function apply(theme: Theme): ResolvedTheme {
  const resolved = resolve(theme)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.style.colorScheme = resolved
  }
  return resolved
}

function initialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

const initial = initialTheme()

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initial,
  resolved: apply(initial),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    set({ theme, resolved: apply(theme) })
  },
  toggle: () => {
    const next: Theme = get().resolved === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().theme === 'system') {
      useThemeStore.setState({ resolved: apply('system') })
    }
  })
}
