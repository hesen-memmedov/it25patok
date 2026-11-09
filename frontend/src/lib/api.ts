import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '@/store/auth'
import type { ApiEnvelope, AuthResponse, User } from './types'
import { safeFileDownloadName } from './utils'

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8081/api/v1'
export const API_URL = rawApiUrl.replace(/\/+$/, '')
export const WS_URL = ((import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:8081/ws')
  .replace(/\/+$/, '')

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 120_000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function requestRefresh(): Promise<string | null> {
  try {
    const response = await axios.post<ApiEnvelope<{ accessToken: string; user: User }>>(
      `${API_URL}/auth/refresh`,
      null,
      {
        withCredentials: true,
        timeout: 20_000,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      },
    )
    const data = response.data.data
    if (!data?.accessToken || !data.user) {
      useAuthStore.getState().clear()
      return null
    }
    useAuthStore.getState().setSession(data.user, data.accessToken)
    return data.accessToken
  } catch {
    useAuthStore.getState().clear()
    return null
  }
}

function refreshOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = requestRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const isAuthRoute = original?.url?.includes('/auth/')
    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true
      const token = await refreshOnce()
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

export function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.error) {
    const error = new Error(envelope.error.message)
    Object.assign(error, { code: envelope.error.code })
    throw error
  }
  return envelope.data as T
}

export async function getData<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<ApiEnvelope<T>>(url, config)
  return unwrap(response.data)
}

export async function postData<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<ApiEnvelope<T>>(url, body, config)
  return unwrap(response.data)
}

export async function putData<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<ApiEnvelope<T>>(url, body, config)
  return unwrap(response.data)
}

export async function patchData<T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.patch<ApiEnvelope<T>>(url, body, config)
  return unwrap(response.data)
}

export async function deleteData<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<ApiEnvelope<T>>(url, config)
  return unwrap(response.data)
}

export async function login(identifier: string, password: string): Promise<AuthResponse> {
  return postData<AuthResponse>('/auth/login', { identifier, password })
}

export async function verifyOtp(
  challengeId: string,
  code: string,
  rememberDevice: boolean,
): Promise<AuthResponse> {
  return postData<AuthResponse>('/auth/verify-otp', { challengeId, code, rememberDevice })
}

export async function resendOtp(challengeId: string): Promise<{ challengeId: string }> {
  return postData<{ challengeId: string }>('/auth/resend-otp', { challengeId })
}

export async function logoutRequest(): Promise<void> {
  try {
    await postData<void>('/auth/logout')
  } finally {
    useAuthStore.getState().clear()
  }
}

export async function bootstrapSession(): Promise<void> {
  const store = useAuthStore.getState()
  try {
    const response = await axios.post<ApiEnvelope<{ accessToken: string; user: User }>>(
      `${API_URL}/auth/refresh`,
      null,
      {
        withCredentials: true,
        timeout: 15_000,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      },
    )
    const data = response.data.data
    if (data?.accessToken && data.user) {
      store.setSession(data.user, data.accessToken)
      return
    }
  } catch {
    // Sessiya yoxdur — anonim davam edirik.
  }
  store.setAnonymous()
}

export async function downloadBlob(
  url: string,
  filename: string,
  config?: AxiosRequestConfig,
): Promise<void> {
  const response = await api.get<Blob>(url, { ...config, responseType: 'blob' })
  const blobUrl = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = safeFileDownloadName(filename)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
}

export function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  config?: AxiosRequestConfig,
): Promise<unknown> {
  return api
    .post<ApiEnvelope<unknown>>(url, formData, {
      ...config,
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    })
    .then((response) => unwrap(response.data))
}

export { axios }

// Fetch wrapper that mirrors the axios client's 401-refresh behavior for raw fetch callers:
// supplies the current token from the store, refreshes once on 401, retries, then clears auth.
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_URL}${input}`
  const doFetch = (token: string | null) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    })

  const token = useAuthStore.getState().accessToken
  let response = await doFetch(token)

  if (response.status === 401) {
    const refreshed = await refreshOnce()
    if (refreshed) {
      response = await doFetch(useAuthStore.getState().accessToken)
    } else {
      useAuthStore.getState().clear()
      if (typeof window !== 'undefined') {
        window.location.assign('/login')
      }
    }
  }
  return response
}
