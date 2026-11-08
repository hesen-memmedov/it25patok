import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronDown, LogOut, Search, Settings, User as UserIcon } from 'lucide-react'
import { Avatar, Button, EmptyState } from '@/components/ui'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useAuthStore } from '@/store/auth'
import { useLogout } from '@/hooks/useLogout'
import { unreadTotal, useChatRooms } from '@/lib/chat'
import { cn, fullName, relativeTime, roleLabel } from '@/lib/utils'

export function Topbar() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const { logout, loading } = useLogout()
  const rooms = useChatRooms()
  const [search, setSearch] = useState('')
  const [userMenu, setUserMenu] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenu && !notifications) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (userRef.current && !userRef.current.contains(target)) setUserMenu(false)
      if (bellRef.current && !bellRef.current.contains(target)) setNotifications(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [userMenu, notifications])

  if (!user) return null
  const unread = unreadTotal(rooms.data)
  const unreadRooms = (rooms.data ?? []).filter((room) => room.unread > 0)

  const submitSearch = () => {
    const query = search.trim()
    if (!query) return
    const base =
      user.role === 'ADMIN' ? '/admin/users'
        : user.role === 'TEACHER' ? '/teacher/assignments'
          : '/student/assignments'
    navigate(`${base}?search=${encodeURIComponent(query)}`)
    setSearch('')
  }

  return (
    <header className="sticky top-0 z-30 hidden h-[68px] items-center gap-4 border-b border-slate-200/70 bg-white/75 px-6 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b1020]/80 md:flex lg:px-8">
      <form
        className="relative w-full max-w-[340px]"
        onSubmit={(event) => {
          event.preventDefault()
          submitSearch()
        }}
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            user.role === 'ADMIN' ? 'İstifadəçi axtar…'
              : user.role === 'TEACHER' ? 'Mövzu axtar…'
                : 'Tapşırıq axtar…'
          }
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-primary-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:bg-white/[0.08]"
          aria-label="Axtarış"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative" ref={bellRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setNotifications((value) => !value)
              setUserMenu(false)
            }}
            aria-label="Bildirişlər"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Button>
          {notifications && (
            <div className="absolute right-0 top-12 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111827]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Bildirişlər</span>
                <Link
                  to="/chat"
                  onClick={() => setNotifications(false)}
                  className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-300"
                >
                  Çata keç
                </Link>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {unreadRooms.length === 0 ? (
                  <EmptyState title="Yeni bildiriş yoxdur" description="Oxunmamış çat mesajı olmayanda burada sakitlik olur." className="py-8" />
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {unreadRooms.map((room) => (
                      <li key={room.id}>
                        <Link
                          to={`/chat/${room.id}`}
                          onClick={() => setNotifications(false)}
                          className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                            <Bell className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {room.name}
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">
                              {room.unread} oxunmamış mesaj
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {relativeTime(room.lastMessageAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />

        <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-white/10" />

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => {
              setUserMenu((value) => !value)
              setNotifications(false)
            }}
            className={cn(
              'flex items-center gap-2 rounded-xl p-1 pr-1.5 transition hover:bg-slate-100 dark:hover:bg-white/[0.07]',
              userMenu && 'bg-slate-100 dark:bg-white/[0.07]',
            )}
            aria-haspopup="menu"
            aria-expanded={userMenu}
          >
            <Avatar user={user} size="sm" />
            <span className="hidden max-w-[110px] truncate text-left text-xs font-semibold text-slate-700 dark:text-slate-200 xl:block">
              {fullName(user)}
            </span>
            <ChevronDown className={cn('hidden h-3.5 w-3.5 text-slate-400 transition-transform xl:block', userMenu && 'rotate-180')} />
          </button>

          {userMenu && (
            <div
              role="menu"
              className="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#111827]"
            >
              <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{fullName(user)}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-300">
                  {roleLabel(user.role)}
                  {user.groupCode ? ` · ${user.groupCode}` : ''}
                </p>
              </div>
              <div className="p-1.5">
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
                >
                  <UserIcon className="h-4 w-4" />
                  {t('nav.profile')}
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    to="/admin/settings"
                    role="menuitem"
                    onClick={() => setUserMenu(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    {t('nav.settings')}
                  </Link>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={logout}
                  disabled={loading}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
