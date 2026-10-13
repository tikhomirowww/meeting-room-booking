import type { ComponentProps } from 'react'
import { getErrorMessage } from '@/shared/api'
import { Alert, Button, Spinner } from '@/shared/ui'
import { Timeline } from '../Timeline'

type Props = ComponentProps<typeof Timeline> & {
  status: 'pending' | 'error' | 'success'
  error: unknown
  isRefreshing: boolean
  onRetry: () => void
}

export function DaySchedule({ status, error, isRefreshing, onRetry, ...timeline }: Props) {
  if (status === 'pending') {
    return (
      <div role="status" className="flex flex-col gap-2" aria-label="Loading schedule">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200/70" />
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <Alert
        tone="error"
        title="Could not load bookings"
        action={
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {getErrorMessage(error)}
      </Alert>
    )
  }

  const isEmpty = timeline.bookings.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-6 items-center justify-between gap-2 text-sm text-slate-500">
        <p aria-live="polite">
          {isEmpty
            ? 'No bookings on this day — the room is free.'
            : `${timeline.bookings.length} ${timeline.bookings.length === 1 ? 'booking' : 'bookings'}`}
        </p>
        {isRefreshing && (
          <span className="flex items-center gap-1.5" role="status">
            <Spinner className="size-4" /> Refreshing…
          </span>
        )}
      </div>
      <Timeline {...timeline} />
    </div>
  )
}
