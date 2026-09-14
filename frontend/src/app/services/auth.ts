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
  plan?: string
  has_gov_api_key?: boolean
  is_demo?: boolean
  last_login_at?: string | null
  created_at?: string | null
  removed_at?: string | null
  purge_at?: string | null
  purge_days?: number
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

/** `GET /auth/me` — current customer profile. */
export async function getCustomerMe(): Promise<AuthProfile> {
  const { data } = await api.get<AuthProfile>('/auth/me')
  return data
}

/** `PATCH /auth/me` — update name and phone. */
export async function updateCustomerProfile(body: {
  name: string
  phone: string
}): Promise<AuthProfile> {
  const { data } = await api.patch<AuthProfile>('/auth/me', body)
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
  plan?: string
}

export interface CreateAdminUserResult extends AdminUserRow {
  email_sent?: boolean
  email_error?: string | null
  setup_url?: string | null
}

/** `POST /admin/users` — admin invites a customer (set-password email). */
export async function createAdminUser(
  token: string,
  body: CreateAdminUserInput,
): Promise<CreateAdminUserResult> {
  const { data } = await api.post<CreateAdminUserResult>('/admin/users', body, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export interface ActivateAdminUserInput {
  gov_api_key?: string
  naics_codes?: string[]
  naics_sector_code?: string
  naics_group_code?: string
}

/** `POST /admin/users/:id/activate` — attach key + mark workspace ready. */
export async function activateAdminUser(
  token: string,
  userId: number | string,
  body: ActivateAdminUserInput = {},
): Promise<AdminUserRow> {
  const { data } = await api.post<AdminUserRow>(`/admin/users/${userId}/activate`, body, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

/** `PATCH /admin/users/:id/plan` — free ↔ paid on the same login. */
export async function setAdminUserPlan(
  token: string,
  userId: number | string,
  plan: 'free' | 'paid',
): Promise<AdminUserRow> {
  const { data } = await api.patch<AdminUserRow>(
    `/admin/users/${userId}/plan`,
    { plan },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

/** Soft-remove: blocks login; data hard-deleted after purge window. */
export async function removeAdminUser(
  token: string,
  userId: number | string,
): Promise<AdminUserRow> {
  const { data } = await api.post<AdminUserRow>(
    `/admin/users/${userId}/remove`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

/** Undo soft-remove before purge. */
export async function restoreAdminUser(
  token: string,
  userId: number | string,
): Promise<AdminUserRow> {
  const { data } = await api.post<AdminUserRow>(
    `/admin/users/${userId}/restore`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export interface FreeSignupInput {
  name: string
  email: string
  phone: string
  company: string
}

export interface FreeSignupResult {
  ok: boolean
  email: string
  status: string
  plan: string
  email_sent: boolean
  message: string
}

/** `POST /plans/free/signup` — public free-plan onboarding. */
export async function signupFreePlan(body: FreeSignupInput): Promise<FreeSignupResult> {
  const { data } = await api.post<FreeSignupResult>('/plans/free/signup', body)
  return data
}

/** `POST /auth/set-password` — complete invite / payment setup link. */
export async function setCustomerPassword(
  token: string,
  password: string,
): Promise<{ email: string; status: string; plan?: string; next?: string }> {
  const { data } = await api.post<{
    email: string
    status: string
    plan?: string
    next?: string
  }>('/auth/set-password', {
    token,
    password,
  })
  return data
}

export interface ProvisioningStatus {
  email: string
  status: string
  plan: string
  ready: boolean
  message: string
}

/** `GET /auth/provisioning-status` — poll workspace wait page. */
export async function getProvisioningStatus(email: string): Promise<ProvisioningStatus> {
  const { data } = await api.get<ProvisioningStatus>('/auth/provisioning-status', {
    params: { email },
  })
  return data
}

export interface NaicsCodeRow {
  code: string
  title: string
}

export interface NaicsGroup {
  group_code: string
  group_title: string
  codes: NaicsCodeRow[]
}

export interface NaicsSector {
  sector_code: string
  sector_title: string
  code_count: number
  groups: NaicsGroup[]
}

export interface NaicsCatalog {
  sectors: NaicsSector[]
}

export interface UserNaicsCoverage {
  user_id: number
  codes: string[]
  details: Array<{
    code: string
    title: string
    sector_code: string
    sector_title: string
    group_code: string
    group_title: string
  }>
  sector_counts: Record<string, number>
  count: number
}

/** `GET /admin/naics/catalog` — global sector catalog for admin assignment. */
export async function listNaicsCatalog(token: string): Promise<NaicsCatalog> {
  const { data } = await api.get<NaicsCatalog>('/admin/naics/catalog', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

/** `GET /admin/users/:id/naics` */
export async function getUserNaicsCoverage(
  token: string,
  userId: number | string,
): Promise<UserNaicsCoverage> {
  const { data } = await api.get<UserNaicsCoverage>(`/admin/users/${userId}/naics`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

/** `PUT /admin/users/:id/naics` — codes, sector_code, or group_code. */
export async function setUserNaicsCoverage(
  token: string,
  userId: number | string,
  body: { codes?: string[]; sector_code?: string; group_code?: string },
): Promise<UserNaicsCoverage> {
  const { data } = await api.put<UserNaicsCoverage>(`/admin/users/${userId}/naics`, body, {
    headers: { Authorization: `Bearer ${token}` },
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
