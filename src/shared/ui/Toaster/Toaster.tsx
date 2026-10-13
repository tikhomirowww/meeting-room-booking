import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { toastStore, type Toast } from './toastStore'

const DURATION_MS = 2000

function ToastItem({ toast }: { toast: Toast }) {
  const timer = useRef<number | undefined>(undefined)

  const stop = useCallback(() => window.clearTimeout(timer.current), [])
  const start = useCallback(() => {
    stop()
    timer.current = window.setTimeout(() => toastStore.dismiss(toast.id), DURATION_MS)
  }, [stop, toast.id])

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  return (
    <li
      onMouseEnter={stop}
      onMouseLeave={start}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg motion-safe:animate-[toast-in_200ms_ease-out] sm:w-80"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs" aria-hidden="true">
        ✓
      </span>
      <div className="flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-slate-300">{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => toastStore.dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded p-1 text-slate-400 hover:text-white"
      >
        ✕
      </button>
    </li>
  )
}

export function Toaster() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)

  return (
    <ol
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </ol>
  )
}
