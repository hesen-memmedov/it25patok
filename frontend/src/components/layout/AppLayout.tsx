import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileTabBar } from './MobileTabBar'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-slate-50/80 dark:bg-[#0b1020]">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.10),transparent_55%),radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.07),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.14),transparent_55%),radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.08),transparent_50%)]"
      />
      <ScrollToTop />
      <Sidebar />
      <div className="relative md:pl-[76px] lg:pl-[260px]">
        <Topbar />
        <main className="pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
