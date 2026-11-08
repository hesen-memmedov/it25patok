import type { CSSProperties, FC, ReactNode } from 'react'

declare module 'sonner' {
  export interface ToastOptions {
    title?: string
    description?: string
    action?: ReactNode
    style?: CSSProperties
    duration?: number
    [key: string]: unknown
  }

  export type ToastMessage = string | ReactNode

  export interface SonnerToast {
    (message: ToastMessage, data?: ToastOptions): string | number
    success: (message: ToastMessage, data?: ToastOptions) => string | number
    error: (message: ToastMessage, data?: ToastOptions) => string | number
    warning: (message: ToastMessage, data?: ToastOptions) => string | number
    info: (message: ToastMessage, data?: ToastOptions) => string | number
    loading: (message: ToastMessage, data?: ToastOptions) => string | number
    message: (message: ToastMessage, data?: ToastOptions) => string | number
    custom: (jsx: (id: number | string) => ReactNode, data?: ToastOptions) => string | number
    dismiss: (id?: number | string) => void
    promise: <T>(
      promise: Promise<T> | (() => Promise<T>),
      data: { loading?: string; success?: string | ((value: T) => string); error?: string | ((error: unknown) => string); description?: string }
    ) => Promise<T>
  }

  export const toast: SonnerToast

  export const Toaster: FC<{
    position?: string
    theme?: string
    richColors?: boolean
    closeButton?: boolean
    toastOptions?: ToastOptions
  }>
}
