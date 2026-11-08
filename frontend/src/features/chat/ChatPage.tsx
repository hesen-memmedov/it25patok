import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useTranslation } from 'react-i18next'
import { Container, Row, Col, Button, Badge, Spinner } from '@/components/ui'
import { useToast } from '@/lib/toast'

import { ChatRoom, ChatMessage } from '@/lib/types'
import { useChatRooms } from '@/lib/chat'
import { API_URL, WS_URL, apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export default function ChatPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: roomsData } = useChatRooms()

  useEffect(() => {
    if (roomsData) {
      setRooms(roomsData)
    }
  }, [roomsData])

  useEffect(() => {
    if (status !== 'authenticated' || !user) return
    if (isConnected) return
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const client = new Client({ webSocketFactory: () => new SockJS(WS_URL) })
    client.connectHeaders = { Authorization: `Bearer ${token}` }
    client.onConnect = () => setIsConnected(true)
    client.onDisconnect = () => setIsConnected(false)
    client.onStompError = () => setIsConnected(false)
    client.onWebSocketClose = () => setIsConnected(false)
    client.onWebSocketError = () => setIsConnected(false)
    clientRef.current = client
    client.activate()

    return () => {
      clientRef.current = null
      void client.deactivate()
    }
  }, [status, user, isConnected])

  useEffect(() => {
    if (!isConnected || !roomId) return
    const client = clientRef.current
    if (!client) return
    const subscription = client.subscribe(
      `/topic/room.${roomId}`,
      (message) => {
        const data = JSON.parse(message.body) as ChatMessage
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
      },
    )
    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, isConnected])

  const sendMessage = useCallback(
    (text: string) => {
      const client = clientRef.current
      if (!client || !roomId || !text.trim()) return
      const sender = user
      if (!sender) return

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        roomId,
        senderId: sender.id,
        senderName: sender.firstName || 'Unknown',
        senderRole: sender.role,
        senderAvatar: sender.avatarFileId,
        text,
        replyToId: null,
        replySenderName: null,
        replyText: null,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }

      client.publish({
        destination: `/app/chat.send`,
        body: JSON.stringify(msg),
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setInputValue('')
    },
    [roomId, user, accessToken],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        sendMessage(inputValue)
      }
    },
    [sendMessage, inputValue],
  )

  const createRoom = useCallback(async () => {
    if (!user) return
    if (!newRoomName.trim()) return

    try {
      const response = await apiFetch(`${API_URL}/chat/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: newRoomName }),
      })
      const data = await response.json()
      if (response.ok) {
        setShowCreateRoom(false)
        setNewRoomName('')
        await queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
      } else {
        toast({ title: 'Xəta', description: data.message || 'Xəta baş verdi.' })
      }
    } catch {
      toast({ title: 'Xəta', description: 'Xəta baş verdi.' })
    }
  }, [user, newRoomName, accessToken, queryClient, toast])

  if (status !== 'authenticated' || !user) {
    return (
      <Container className="min-h-screen flex items-center justify-center">
        <div className="py-8 text-center">
          <h1 className="display-4 mb-4">{t('auth.login_required')}</h1>
          <p className="lead text-muted-foreground">{t('auth.please_login')}</p>
        </div>
      </Container>
    )
  }

  if (!isConnected) {
    return (
      <Container className="min-h-screen flex items-center justify-center">
        <div className="py-8 text-center">
          <Row className="align-items-center justify-content-center">
            <Col>
              <Spinner className="mx-auto mb-4" />
              <p>{t('chat.connecting')}</p>
            </Col>
          </Row>
        </div>
      </Container>
    )
  }

  return (
    <Container className="h-screen">
      <div className="flex h-full g-0">
        <div className="w-full sm:w-1/3 border-end border-slate-200 dark:border-white/10 h-full p-4 flex flex-col">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">{t('chat.rooms')}</h4>
          <div className="mb-3">
            <Button variant="outline" size="sm" onClick={() => setShowCreateRoom(true)}>
              {t('chat.create_room')}
            </Button>
          </div>
          {rooms.map((room) => (
            <div
              key={room.id}
              className={cn(
                'p-3 rounded-md mb-2 cursor-pointer',
                'bg-white dark:bg-black/30 dark:bg-black/30',
                'border-b border-slate-200 dark:border-white/10',
                room.id === roomId && 'bg-primary-500/10 text-primary-300',
              )}
              onClick={() => setRoomId(room.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-slate-100">{room.name}</span>
                <Badge tone="muted" className="text-[10px] px-2 py-0.5">
                  {room.unread}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleString() : t('chat.no_messages')}
              </p>
            </div>
          ))}
          {!rooms.length && <p className="text-xs text-slate-500 mt-2">{t('chat.no_rooms')}</p>}
        </div>

        <div className="w-full sm:w-2/3 h-full p-4 overflow-y-auto flex flex-col">
          {roomId && (
            <div className="mb-4 border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {rooms.find((r) => r.id === roomId)?.name || t('chat.select_room')}
              </h3>
            </div>
          )}

          <div id={`chat-messages-${roomId || 'root'}`} className="flex-1 overflow-y-auto space-y-4">
            {!messages.length && (
              <div className="p-3 rounded-md text-center text-sm text-slate-500 dark:text-slate-400">
                {t('chat.messages_7day_notice')}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex items-start gap-3', msg.senderId === user.id ? 'origin-last' : 'origin-first')}
              >
                <div
                  className={cn(
                    'p-3 rounded-lg max-w-xs',
                    msg.senderId === user.id ? 'bg-primary-600' : 'bg-white dark:bg-black/30 dark:bg-black/30',
                    'text-sm',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-100 break-words">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 border-t border-slate-200 dark:border-white/10 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.message_placeholder')}
              className={cn(
                'flex-1 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 bg-white dark:bg-black/30 dark:bg-black/30 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                'text-sm',
              )}
              disabled={!isConnected}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => sendMessage(inputValue)}
              disabled={!isConnected || !inputValue.trim()}
            >
              {t('chat.send')}
            </Button>
          </div>
        </div>
      </div>

      {showCreateRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 dark:bg-black/90 rounded-lg p-6 w-full max-w-md transform scale-95 opacity-100 transition-all">
            <h3 className="text-lg font-semibold mb-3">{t('chat.create_room')}</h3>
            <div className="mb-4">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder={t('chat.room_name')}
                className={cn(
                  'w-full rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
                  'text-sm',
                )}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreateRoom(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={createRoom} disabled={!newRoomName.trim()}>
                {t('chat.create')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}
