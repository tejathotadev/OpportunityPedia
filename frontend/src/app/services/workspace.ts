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
