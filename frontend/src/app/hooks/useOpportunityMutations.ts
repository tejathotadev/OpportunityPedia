import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useCurrentUser } from '@/app/providers/currentUserContext'
import {
  assignOpportunity,
  reassignOpportunity,
  unassignOpportunity,
} from '@/app/services/assignments'
import { sendOutreach } from '@/app/services/outreach'
import { INVALIDATE_ON_MUTATION } from '@/app/services/queryKeys'
import { toast } from '@/app/store/useToastStore'
import type { SendOutreachPayload } from '@/app/types'

/**
 * Shared write operations. Every mutation refreshes the same key families so
 * the table, drawer, dashboard and activity feed stay in step.
 */
export function useOpportunityMutations() {
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()

  const refresh = () => {
    for (const key of INVALIDATE_ON_MUTATION) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }

  const assign = useMutation({
    mutationFn: (opportunityId: string) => assignOpportunity(opportunityId, user),
    onSuccess: () => {
      refresh()
      toast.success('Opportunity assigned to you.')
    },
    onError: () => toast.error('The assignment couldn’t be saved. Please try again.'),
  })

  const reassign = useMutation({
    mutationFn: ({ opportunityId, userId }: { opportunityId: string; userId: string }) =>
      reassignOpportunity(opportunityId, userId),
    onSuccess: (opportunity) => {
      refresh()
      toast.success(`Opportunity reassigned to ${opportunity.assignedToName}.`)
    },
    onError: () => toast.error('The reassignment couldn’t be saved. Please try again.'),
  })

  const unassign = useMutation({
    mutationFn: (opportunityId: string) => unassignOpportunity(opportunityId),
    onSuccess: () => {
      refresh()
      toast.success('Assignment removed.')
    },
    onError: () => toast.error('The assignment couldn’t be removed. Please try again.'),
  })

  const outreach = useMutation({
    mutationFn: (payload: SendOutreachPayload) => sendOutreach(payload),
    onSuccess: (result) => {
      refresh()
      toast.success(`Outreach sent to ${result.opportunity.companyName}.`)
    },
    onError: () => toast.error('Outreach couldn’t be sent. Please try again.'),
  })

  return { assign, reassign, unassign, outreach }
}
