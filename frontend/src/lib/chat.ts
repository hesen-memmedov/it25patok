import { useQuery } from '@tanstack/react-query'
import { getData } from './api'
import type { ChatRoom } from './types'

export function useChatRooms() {
  return useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => getData<ChatRoom[]>('/chat/rooms'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function unreadTotal(rooms: ChatRoom[] | undefined): number {
  return (rooms ?? []).reduce((sum, room) => sum + room.unread, 0)
}
