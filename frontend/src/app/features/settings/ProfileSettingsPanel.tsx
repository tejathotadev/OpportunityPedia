import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { UserAvatar } from '@/app/components/common/Avatar'
import { Button } from '@/app/components/common/Button'
import { Field, TextInput } from '@/app/components/forms/Field'
import { Panel } from '@/app/components/layout/Panel'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { getCustomerMe, updateCustomerProfile } from '@/app/services/auth'
import { ApiError } from '@/app/services/api'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'

export function ProfileSettingsPanel() {
  const { user } = useCurrentUser()
  const patchUserProfile = useAuthStore((s) => s.patchUserProfile)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')

  useEffect(() => {
    setName(user.name)
    setPhone(user.phone ?? '')
  }, [user.name, user.phone])

  useEffect(() => {
    void getCustomerMe()
      .then((profile) => patchUserProfile(profile))
      .catch(() => undefined)
  }, [patchUserProfile])

  const save = useMutation({
    mutationFn: () =>
      updateCustomerProfile({
        name: name.trim(),
        phone: phone.trim(),
      }),
    onSuccess: (profile) => {
      patchUserProfile(profile)
      toast.success('Profile saved.')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not save profile.')
    },
  })

  return (
    <Panel>
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <UserAvatar name={user.name} tone={user.avatarTone} size="xl" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
          <p className="truncate text-[13px] text-ink-muted">
            {user.jobTitle}
            {user.company && user.company !== '—' ? ` · ${user.company}` : ''}
          </p>
        </div>
      </div>

      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!name.trim()) return
          save.mutate()
        }}
      >
        <Field label="Full name" htmlFor="profile-name">
          <TextInput
            id="profile-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field label="Role" htmlFor="profile-role" hint="Your seat in this workspace.">
          <TextInput id="profile-role" value={user.jobTitle} readOnly />
        </Field>
        <Field
          label="Work email"
          htmlFor="profile-email"
          hint="Managed by your identity provider."
        >
          <TextInput id="profile-email" value={user.email} readOnly />
        </Field>
        <Field label="Phone" htmlFor="profile-phone">
          <TextInput
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" loading={save.isPending} disabled={!name.trim()}>
            Save changes
          </Button>
        </div>
      </form>
    </Panel>
  )
}
