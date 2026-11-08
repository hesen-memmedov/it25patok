import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid } from 'lucide-react'
import { Modal } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { unreadTotal, useChatRooms } from '@/lib/chat'
import { adminMoreNav, bottomNavForRole, isNavActive } from '@/app/navigation'

export function MobileTabBar() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const rooms = useChatRooms()
  const unread = unreadTotal(rooms.data)
  const [moreOpen, setMoreOpen] = useState(false)

  if (!user) return null
  const items = bottomNavForRole(user.role)
  const moreActive = user.role === 'ADMIN' && adminMoreNav.some((item) => isNavActive(location.pathname, item))

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1020]/92 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Mobil menyu"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {items.map((item) => {
            const active = isNavActive(location.pathname, item)
            const showBadge = item.badge === 'chat' && unread > 0
            return (
              <Link
                key={item.to + item.labelKey}
                to={item.to}
                className={cn(
                  'relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 px-1 pb-1 pt-2 text-[10px] font-semibold transition',
                  active
                    ? 'text-primary-600 dark:text-primary-300'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'relative flex h-8 w-12 items-center justify-center rounded-xl transition-all',
                    active && 'bg-primary-50 dark:bg-primary-500/15',
                  )}
                >
                  <item.icon className={cn('h-[21px] w-[21px]', active && 'scale-105')} strokeWidth={active ? 2.3 : 1.9} />
                  {showBadge && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{t(`nav.${item.labelKey}`)}</span>
                {active && <span className="absolute -top-px h-0.5 w-8 rounded-full bg-gradient-to-r from-primary-500 to-violet-500" />}
              </Link>
            )
          })}
          {user.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-1 px-1 pb-1 pt-2 text-[10px] font-semibold transition',
                moreActive
                  ? 'text-primary-600 dark:text-primary-300'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
              )}
              aria-label={t('nav.more')}
            >
              <span
                className={cn(
                  'flex h-8 w-12 items-center justify-center rounded-xl transition-all',
                  moreActive && 'bg-primary-50 dark:bg-primary-500/15',
                )}
              >
                <LayoutGrid className={cn('h-[21px] w-[21px]', moreActive && 'scale-105')} strokeWidth={moreActive ? 2.3 : 1.9} />
              </span>
              <span>{t('nav.more')}</span>
              {moreActive && <span className="absolute -top-px h-0.5 w-8 rounded-full bg-gradient-to-r from-primary-500 to-violet-500" />}
            </button>
          )}
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('nav.more')}>
        <div className="grid grid-cols-2 gap-2 pb-2">
          {adminMoreNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className="flex min-h-[76px] flex-col items-start justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-slate-700 transition active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm dark:bg-white/10 dark:text-primary-300">
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[13px] font-semibold">{t(`nav.${item.labelKey}`)}</span>
            </Link>
          ))}
        </div>
      </Modal>
    </>
  )
}
