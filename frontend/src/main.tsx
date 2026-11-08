import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import '@/styles/globals.css'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { bootstrapSession } from '@/lib/api'
import { useThemeStore } from '@/store/theme'

void bootstrapSession()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker qeydiyyatı uğursuz olarsa tətbiq onlayn rejimdə işləməyə davam edir.
    })
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
)

// Tema tətbiqini ilk render-dən əvvəl sinxronlaşdır.
useThemeStore.getState().setTheme(useThemeStore.getState().theme)
