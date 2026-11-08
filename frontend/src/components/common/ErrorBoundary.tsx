import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Köhnə service worker/keş səbəbindən silinmiş JS chunk-ları — avtomatik bir dəfə yenilə
    const msg = `${error?.name ?? ''} ${error?.message ?? ''}`
    const isChunkError = /chunkloaderror|loading chunk|dynamically imported module|importing a module script|module script has been removed/i.test(msg)
    const reloads = Number(sessionStorage.getItem('it25-chunk-reloads') || '0')
    if (isChunkError && reloads < 2) {
      sessionStorage.setItem('it25-chunk-reloads', String(reloads + 1))
      window.location.reload()
      return
    }
    console.error('UI xətası', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Gözlənilməz xəta</h1>
            <p className="mt-1 text-sm text-slate-500">Səhifəni yeniləyin və ya yenidən cəhd edin.</p>
          </div>
          <Button onClick={() => window.location.reload()}>Səhifəni yenilə</Button>
        </div>
      )
    }
    return this.props.children
  }
}
