import { api } from '@/app/services/api'

export interface WorkspaceMember {
  id: number | string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  status: string
  seat_role: 'owner' | 'member' | string
  workspace_id: number | string
  last_login_at?: string | null
  created_at?: string | null
}

export interface WorkspaceTeam {
  workspace_id: number | string
  plan: string
  seat_limit: number
  seats_used: number
  seats_remaining: number
  can_invite: boolean
  members: WorkspaceMember[]
}

export interface InviteMemberInput {
  name: string
  email: string
  phone?: string
}

export interface InviteMemberResult extends WorkspaceMember {
  email_sent?: boolean
  email_error?: string | null
  setup_url?: string | null
  seat_limit?: number
  seats_used?: number
}

/** `GET /workspace/team` — seats in the signed-in user's workspace. */
export async function listWorkspaceTeam(): Promise<WorkspaceTeam> {
  const { data } = await api.get<WorkspaceTeam>('/workspace/team')
  return data
}

export interface WorkspacePlanTrial {
  applies: boolean
  days: number | null
  ends_at: string | null
  seconds_remaining: number | null
  expired: boolean
}

export interface WorkspacePlanSummary {
  workspace_id: number | string
  plan: string
  is_demo: boolean
  seat_limit: number
  seats_used: number
  seats_remaining: number
  trial: WorkspacePlanTrial
  limits: {
    radar_runs_per_day: number
    radar_cooldown_minutes: number
    team_seats: number
  }
  paid_comparison: {
    plan: string
    seat_limit: number
  }
}

/** `GET /workspace/plan` — trial clock + limits for Settings. */
export async function getWorkspacePlan(): Promise<WorkspacePlanSummary> {
  const { data } = await api.get<WorkspacePlanSummary>('/workspace/plan')
  return data
}

/** `POST /workspace/team/invite` — owner invites a teammate (set-password email). */
export async function inviteWorkspaceMember(
  body: InviteMemberInput,
): Promise<InviteMemberResult> {
  const { data } = await api.post<InviteMemberResult>('/workspace/team/invite', body)
  return data
}

/** `DELETE /workspace/team/:id` — owner removes a teammate seat. */
export async function removeWorkspaceMember(memberId: number | string): Promise<WorkspaceTeam> {
  const { data } = await api.delete<WorkspaceTeam>(`/workspace/team/${memberId}`)
  return data
}

export interface WorkspaceSmtpSettings {
  configured: boolean
  enabled: boolean
  can_manage: boolean
  host: string | null
  port: number
  username: string | null
  from_email: string | null
  from_name: string | null
  use_ssl: boolean
  has_password: boolean
  updated_at: string | null
  using_platform_fallback: boolean
}

export interface WorkspaceSmtpInput {
  host: string
  port: number
  username: string
  /** Leave empty to keep the saved password. */
  password?: string
  from_email: string
  from_name?: string
  use_ssl: boolean
  enabled: boolean
}

export interface WorkspaceSmtpTestInput {
  to_email?: string
  host?: string
  port?: number
  username?: string
  password?: string
  from_email?: string
  from_name?: string
  use_ssl?: boolean
}

/** `GET /workspace/smtp` — company SMTP status (no password). */
export async function getWorkspaceSmtp(): Promise<WorkspaceSmtpSettings> {
  const { data } = await api.get<WorkspaceSmtpSettings>('/workspace/smtp')
  return data
}

/** `PUT /workspace/smtp` — owner saves company SMTP for outreach. */
export async function saveWorkspaceSmtp(body: WorkspaceSmtpInput): Promise<WorkspaceSmtpSettings> {
  const { data } = await api.put<WorkspaceSmtpSettings>('/workspace/smtp', body)
  return data
}

/** `DELETE /workspace/smtp` — owner clears company SMTP (fallback to platform). */
export async function clearWorkspaceSmtp(): Promise<WorkspaceSmtpSettings> {
  const { data } = await api.delete<WorkspaceSmtpSettings>('/workspace/smtp')
  return data
}

/** `POST /workspace/smtp/test` — owner sends a test message. */
export async function testWorkspaceSmtp(
  body: WorkspaceSmtpTestInput = {},
): Promise<{ ok: boolean; to_email: string }> {
  const { data } = await api.post<{ ok: boolean; to_email: string }>('/workspace/smtp/test', body)
  return data
}
