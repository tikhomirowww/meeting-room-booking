export type Toast = { id: number; title: string; message?: string }

type Listener = () => void

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l())

export const toastStore = {
  getSnapshot: () => toasts,
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  },
}

export function toast(title: string, message?: string) {
  toasts = [...toasts, { id: nextId++, title, message }].slice(-3)
  emit()
}
