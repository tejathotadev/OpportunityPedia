import { api } from '@/app/services/api'
import type { AuthProfile } from '@/app/store/useAuthStore'

export interface AuthLoginResult {
  token: string
  user: AuthProfile
}

export interface AdminUserRow {
  id: number | string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  status: string
  is_demo?: boolean
  last_login_at?: string | null
  created_at?: string | null
}

export interface AdminLeadRow {
  id: number | string
  name: string
  email: string
  company?: string | null
  phone?: string | null
  job_title?: string | null
  reason: string
  message: string
  status: string
  admin_notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/** Customer sign-in — `POST /auth/login`. */
export async function loginCustomer(email: string, password: string): Promise<AuthLoginResult> {
  const { data } = await api.post<AuthLoginResult>('/auth/login', { email, password })
  return data
}

/** Platform admin sign-in — `POST /admin/login`. Not linked from marketing. */
export async function loginAdmin(email: string, password: string): Promise<AuthLoginResult> {
  const { data } = await api.post<AuthLoginResult>('/admin/login', { email, password })
  return data
}

/** `GET /admin/me` — validates the admin token. */
export async function getAdminMe(token: string): Promise<AuthProfile> {
  const { data } = await api.get<AuthProfile>('/admin/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

/** `GET /admin/users` — customers visible to the platform admin. */
export async function listAdminUsers(token: string): Promise<AdminUserRow[]> {
  const { data } = await api.get<{ users: AdminUserRow[] }>('/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data.users ?? []
}

export interface CreateAdminUserInput {
  name: string
  email: string
  company?: string
  phone?: string
}

export interface CreateAdminUserResult extends AdminUserRow {
  email_sent?: boolean
  setup_url?: string | null
}

/** `POST /admin/users` — admin invites a customer (set-password email). */
export async function createAdminUser(
  token: string,
  body: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  const { data } = await api.post<CreateAdminUserResult>('/admin/users', body, {
    headers: { Authorization: `Bearer ${token}` },
    // SMTP may take a few seconds; backend caps at SMTP_TIMEOUT_SECONDS.
    timeout: 25_000,
  })
  return data
}

/** `POST /auth/set-password` — complete invite / payment setup link. */
export async function setCustomerPassword(
  token: string,
  password: string,
): Promise<{ email: string; status: string }> {
  const { data } = await api.post<{ email: string; status: string }>('/auth/set-password', {
    token,
    password,
  })
  return data
}

/** `GET /admin/leads` — marketing contact submissions. */
export async function listAdminLeads(token: string): Promise<AdminLeadRow[]> {
  const { data } = await api.get<{ leads: AdminLeadRow[] }>('/admin/leads', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data.leads ?? []
}

/** `PATCH /admin/leads/:id` — update lead status / notes. */
export async function updateAdminLead(
  token: string,
  leadId: number | string,
  body: { status: string; admin_notes?: string | null },
): Promise<AdminLeadRow> {
  const { data } = await api.patch<AdminLeadRow>(`/admin/leads/${leadId}`, body, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}
