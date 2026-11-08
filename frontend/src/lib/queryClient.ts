import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof AxiosError) {
          const status = error.response?.status
          if (status && status >= 400 && status < 500) return false
        }
        return failureCount < 1
      },
    },
    mutations: {
      retry: 0,
    },
  },
})
