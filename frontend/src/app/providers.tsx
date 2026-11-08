import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/queryClient'
import { useThemeStore } from '@/store/theme'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import '@/lib/i18n'

export function AppProviders({ children }: { children: ReactNode }) {
  const resolved = useThemeStore((state) => state.resolved)
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          theme={resolved}
          richColors
          closeButton
          toastOptions={{ style: { borderRadius: '14px' } }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
