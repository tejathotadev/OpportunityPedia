import type { AppNotification } from '@/app/types'

import { api } from './api'

export async function getNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<{ items: AppNotification[] }>('/notifications')
  return data.items
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all')
}
