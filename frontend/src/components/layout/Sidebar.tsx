import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { Logo, LogoMark } from '@/components/common/Logo'
import { cn, fullName, roleLabel } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { logoutRequest } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { unreadTotal, useChatRooms } from '@/lib/chat'
import { isNavActive, navForRole } from '@/app/navigation'

export function Sidebar() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  const rooms = useChatRooms()
  const unread = unreadTotal(rooms.data)

  if (!user) return null
  const items = navForRole(user.role)

  const logout = async () => {
    try {
      await logoutRequest()
    } finally {
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col border-r border-[#ddd6a8]/70 bg-[#f7f4e0]/88 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#1a0e12]/92 md:flex lg:w-[260px]">
      <div className="flex h-[68px] shrink-0 items-center px-4 lg:px-5">
        <div className="lg:hidden">
          <LogoMark />
        </div>
        <div className="hidden lg:block">
          <Logo />
        </div>
      </div>

      <div className="mx-3 mb-2 hidden items-center gap-2 rounded-xl border border-primary-100/80 bg-gradient-to-r from-primary-50 to-violet-50 px-3 py-2 text-[11px] font-semibold text-primary-700 dark:border-primary-400/15 dark:from-primary-500/10 dark:to-violet-500/10 dark:text-primary-200 lg:flex">
        <Sparkles className="h-3.5 w-3.5" />
        <span>İT25A1 · İT25A2 qapalı platforma</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 pb-4 pt-2 scrollbar-none lg:px-3" aria-label="Əsas menyu">
        {items.map((item) => {
          const active = isNavActive(location.pathname, item)
          const showBadge = item.badge === 'chat' && unread > 0
          return (
            <NavLink
              key={item.to + item.labelKey}
              to={item.to}
              end={item.end}
              title={t(`nav.${item.labelKey}`)}
              aria-current={active ? 'page' : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all lg:px-3.5',
                  isActive
                    ? 'bg-gradient-to-r from-primary-600 to-violet-600 text-white shadow-soft'
                    : 'text-slate-600 hover:bg-[#e8e4c8] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex shrink-0 items-center justify-center">
                    <item.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.2 : 1.9} />
                    {showBadge && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white lg:hidden">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </span>
                  <span className="hidden min-w-0 flex-1 truncate lg:block">{t(`nav.${item.labelKey}`)}</span>
                  {showBadge && (
                    <span className="hidden rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white lg:block">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-[#ddd6a8]/70 p-2.5 dark:border-white/[0.08] lg:p-3">
        <NavLink
          to="/profile"
          className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-[#e8e4c8] dark:hover:bg-white/[0.06] lg:p-2"
          title={fullName(user)}
        >
          <Avatar user={user} size="md" />
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">{fullName(user)}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {roleLabel(user.role)}
              {user.groupCode ? ` · ${user.groupCode}` : ''}
            </p>
          </div>
        </NavLink>
        <button
          type="button"
          onClick={() => void logout()}
          title={t('nav.logout')}
          className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-2.5 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 lg:px-3"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span className="hidden lg:block">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
