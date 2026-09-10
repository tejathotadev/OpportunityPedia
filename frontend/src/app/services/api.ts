import axios, { type AxiosInstance } from 'axios'

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
  // Default for most calls; dashboard/radar paths override higher when needed.
  timeout: 30_000,
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

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
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

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      return Promise.reject(new ApiError(messageForStatus(status), status))
    }
    return Promise.reject(new ApiError('Something went wrong.'))
  },
)
