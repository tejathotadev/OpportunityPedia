import { ChevronDown, UserPlus } from 'lucide-react'

import { OwnerAvatar, UserAvatar } from '@/app/components/common/Avatar'
import { Button } from '@/app/components/common/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/common/DropdownMenu'
import { Tooltip } from '@/app/components/common/Tooltip'
import type { User } from '@/app/types'
import { firstNameOf } from '@/app/utils/format'
import { cn } from '@/shared/cn'

interface AssignCellProps {
  assignedToId?: string | null
  assignedToName?: string | null
  currentUserId: string
  team: User[]
  isAssigning?: boolean
  onAssign: (assignee: User) => void
  className?: string
  /** Align the assign button to the end (table action columns). */
  align?: 'start' | 'end'
  /** Button size — tables use sm; drawer actions use default. */
  size?: 'sm' | 'md'
}

function assignedLabel(
  assignedToId: string,
  assignedToName: string | null | undefined,
  currentUserId: string,
): { display: string; full: string } {
  if (assignedToId === currentUserId) {
    return { display: 'You', full: assignedToName?.trim() || 'You' }
  }
  const full = assignedToName?.trim() || 'Teammate'
  // Long legal names crowd the cell; first name + tooltip keeps rows calm.
  const display = full.includes(' ') ? firstNameOf(full) : full
  return { display, full }
}

/**
 * Shared Assign column: secondary Assign control when free, compact owner chip when taken.
 * No Send Outreach / Review — those live in drawers / row click.
 */
export function AssignCell({
  assignedToId,
  assignedToName,
  currentUserId,
  team,
  isAssigning,
  onAssign,
  className,
  align = 'start',
  size = 'sm',
}: AssignCellProps) {
  if (assignedToId) {
    const { display, full } = assignedLabel(assignedToId, assignedToName, currentUserId)
    return (
      <div className={cn('min-w-0 max-w-full', className)}>
        <Tooltip enabled={display !== full} content={full}>
          <span className="block min-w-0 max-w-full">
            <OwnerAvatar
              name={display}
              tone={assignedToId === currentUserId ? 'teal' : undefined}
              className="max-w-full"
            />
          </span>
        </Tooltip>
      </div>
    )
  }

  const me = team.find((m) => m.id === currentUserId) ?? team[0]

  return (
    <div
      className={cn(
        'flex min-w-0',
        align === 'end' ? 'justify-end' : 'justify-start',
        className,
      )}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      role="presentation"
    >
      {team.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size={size}
              variant="secondary"
              iconLeft={<UserPlus />}
              iconRight={<ChevronDown />}
              loading={isAssigning}
            >
              Assign
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align === 'end' ? 'end' : 'start'} className="w-56">
            <DropdownMenuLabel>Assign to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {team.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onSelect={() => onAssign(member)}
                icon={<UserAvatar name={member.name} tone={member.avatarTone} size="xs" />}
              >
                {member.id === currentUserId ? `${member.name} (you)` : member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          size={size}
          variant="secondary"
          iconLeft={<UserPlus />}
          loading={isAssigning}
          onClick={() => {
            if (me) onAssign(me)
          }}
        >
          Assign
        </Button>
      )}
    </div>
  )
}
