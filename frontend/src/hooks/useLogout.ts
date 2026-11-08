import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { logoutRequest } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'

export function useLogout() {
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
  return {
    logout: () => mutation.mutate(),
    loading: mutation.isPending,
  }
}
