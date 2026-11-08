import type { ReactNode } from 'react'
import { toast as sonnerToast } from 'sonner'

export interface ToastInput {
  title?: string
  description?: string
}

function argsOf(input: ToastInput | string | undefined): [string, { description?: string } | undefined] {
  if (typeof input === 'string') return [input, undefined]
  if (!input) return ['', undefined]
  const title = input.title ?? input.description ?? ''
  const description = input.title && input.description ? { description: input.description } : undefined
  return [title, description]
}

export interface SonnerToastApi {
  (input?: ToastInput | string): number
  success: (input?: ToastInput | string) => number
  error: (input?: ToastInput | string) => number
  warning: (input?: ToastInput | string) => number
  info: (input?: ToastInput | string) => number
  loading: (input?: ToastInput | string) => number
  dismiss: (id?: number) => void
  promise: <T>(promise: Promise<T> | (() => Promise<T>), messages: { loading?: string; success?: string; error?: string }) => Promise<T>
}

const api: SonnerToastApi = Object.assign(
  (input?: ToastInput | string): number => {
    const [message, data] = argsOf(input)
    return Number(sonnerToast(message, data as never)) || 0
  },
  {
    success: (input?: ToastInput | string): number => {
      const [message, data] = argsOf(input)
      return Number(sonnerToast.success(message, data as never)) || 0
    },
    error: (input?: ToastInput | string): number => {
      const [message, data] = argsOf(input)
      return Number(sonnerToast.error(message, data as never)) || 0
    },
    warning: (input?: ToastInput | string): number => {
      const [message, data] = argsOf(input)
      return Number(sonnerToast.warning(message, data as never)) || 0
    },
    info: (input?: ToastInput | string): number => {
      const [message, data] = argsOf(input)
      return Number(sonnerToast.info(message, data as never)) || 0
    },
    loading: (input?: ToastInput | string): number => {
      const [message, data] = argsOf(input)
      return Number(sonnerToast.loading(message, data as never)) || 0
    },
    dismiss: (id?: number): void => {
      sonnerToast.dismiss(id)
    },
    promise: <T,>(
      promise: Promise<T> | (() => Promise<T>),
      messages: { loading?: string; success?: string; error?: string },
    ): Promise<T> => sonnerToast.promise(promise, messages) as Promise<T>,
  },
)

export function useToast(): SonnerToastApi {
  return api
}

export type { ReactNode }
