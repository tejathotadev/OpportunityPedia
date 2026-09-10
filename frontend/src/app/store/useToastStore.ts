import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  action?: { label: string; onClick: () => void }
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    counter += 1
    const id = `toast_${counter}`
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    return id
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}))

/** Convenience wrapper so components do not need to touch the store shape. */
export const toast = {
  success: (title: string, description?: string, action?: Toast['action']) =>
    useToastStore.getState().push({ title, description, variant: 'success', action }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'error' }),
  info: (title: string, description?: string, action?: Toast['action']) =>
    useToastStore.getState().push({ title, description, variant: 'info', action }),
}
