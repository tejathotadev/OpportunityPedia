import axios, { type AxiosInstance } from 'axios'

import { API_TIMEOUT_MS } from '@/app/config/timeouts'
import { useAuthStore } from '@/app/store/useAuthStore'
import {
  markCustomerSignedOut,
  markSignedInElsewhere,
  SIGNED_IN_ELSEWHERE_DETAIL,
} from '@/app/utils/authRedirect'

/**
 * Single Axios instance for the FastAPI backend.
 *
 * Paths are relative to the API root, which the backend exposes under
 * `/api/v1`. In production FastAPI serves the built frontend from the same
 * origin, so the relative default works as-is; in development the Vite proxy
 * forwards `/api` to the backend. `VITE_API_BASE_URL` overrides both.
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * The access token will come from the authenticated session once auth exists.
 * Nothing secret is ever stored in frontend source.
 */
let authTokenProvider: () => string | null = () => null

export function setAuthTokenProvider(provider: () => string | null): void {
  authTokenProvider = provider
}

api.interceptors.request.use((config) => {
  // Leave an explicit Authorization header alone (admin calls pass their own).
  const existing = config.headers.Authorization
  if (existing) return config
  const token = authTokenProvider()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** User-facing copy only — raw server errors never reach the interface. */
export class ApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function messageForStatus(status: number | undefined): string {
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 403) return 'You do not have access to this resource.'
  if (status === 409) return 'A user with this email already exists.'
  if (status === 429) return 'Too many requests. Try again a little later.'
  if (status === 502) return 'The email could not be delivered. Check SMTP settings and try again.'
  if (status === 503) return 'Email delivery is not configured on the server.'
  // The backend answers 501 for actions that have no storage behind them yet.
  if (status === 501) return 'This action is not available yet.'
  if (status && status >= 500) return 'The service is temporarily unavailable.'
  return 'The request could not be completed.'
}

function detailFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  return null
}

function bearerFromConfig(config: { headers?: unknown } | undefined): string | null {
  const headers = config?.headers as { Authorization?: string; authorization?: string } | undefined
  const raw = headers?.Authorization || headers?.authorization || ''
  if (typeof raw !== 'string' || !raw.toLowerCase().startsWith('bearer ')) return null
  return raw.slice(7).trim() || null
}

let handlingElsewhere = false

function forceSignOutElsewhere(requestToken: string | null): void {
  if (handlingElsewhere) return
  handlingElsewhere = true
  try {
    const state = useAuthStore.getState()
    const userToken = state.user?.token ?? null
    const adminToken = state.admin?.token ?? null
    const matchedUser = Boolean(requestToken && userToken && requestToken === userToken)
    const matchedAdmin = Boolean(requestToken && adminToken && requestToken === adminToken)

    if (matchedAdmin || (!matchedUser && !matchedAdmin && adminToken && !userToken)) {
      state.clearAdminSession()
      markSignedInElsewhere()
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.assign('/admin/login')
      }
      return
    }

    state.clearUserSession()
    markCustomerSignedOut()
    markSignedInElsewhere()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
  } finally {
    window.setTimeout(() => {
      handlingElsewhere = false
    }, 1500)
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new ApiError('The request timed out. Please try again.'))
      }
      const status = error.response?.status
      const detail = detailFromResponse(error.response?.data)
      if (status === 401 && detail === SIGNED_IN_ELSEWHERE_DETAIL) {
        forceSignOutElsewhere(bearerFromConfig(error.config))
        return Promise.reject(
          new ApiError(SIGNED_IN_ELSEWHERE_DETAIL, status, 'signed_in_elsewhere'),
        )
      }
      return Promise.reject(new ApiError(messageForStatus(status), status))
    }
    return Promise.reject(new ApiError('Something went wrong.'))
  },
)
