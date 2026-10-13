import { useState } from 'react'
import { useBookingsQuery, type Booking } from '@/entities/booking'
import { DeleteBookingButton } from '@/features/booking-delete'
import { BookingForm, useBookingForm } from '@/features/booking-form'
import { MockControlsPanel } from '@/features/mock-controls'
import { useNow } from '@/shared/lib/react'
import { toIsoDate, type IsoDate } from '@/shared/lib/time'
import { WORK_DAY_END, WORK_DAY_START } from '@/shared/config'
import { DateNavigator, DaySchedule } from '@/widgets/day-schedule'

const NO_BOOKINGS: Booking[] = []

export function BookingPage() {
  const now = useNow()
  const today = toIsoDate(now)
  // null = "follow today", so an open tab moves to the new day after midnight.
  const [pickedDate, setPickedDate] = useState<IsoDate | null>(null)
  const date = pickedDate ?? today

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <a
        href="#booking-form"
        className="sr-only rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
      >
        Skip to booking form
      </a>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Meeting room</h1>
        <p className="text-sm text-slate-500">
          Working hours {WORK_DAY_START}–{WORK_DAY_END} · 30 minutes to 2 hours
        </p>
      </header>

      <DateNavigator date={date} now={now} onChange={(next) => setPickedDate(next === today ? null : next)} />

      {/* key: changing the date resets the form state */}
      <BookingDay key={date} date={date} now={now} />

      <footer className="mt-auto">
        <MockControlsPanel />
      </footer>
    </div>
  )
}

function BookingDay({ date, now }: { date: IsoDate; now: Date }) {
  const query = useBookingsQuery(date)
  const bookings = query.data ?? NO_BOOKINGS
  const form = useBookingForm({ date, bookings, now })
  const editing = form.mode.type === 'edit' ? form.mode.booking : undefined

  return (
    <main className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Day schedule" className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <DaySchedule
          status={query.status}
          error={query.error}
          isRefreshing={query.isFetching && !query.isPending}
          onRetry={() => void query.refetch()}
          date={date}
          now={now}
          bookings={bookings}
          startOptions={form.startOptions}
          selectedId={editing?.id}
          draft={form.values}
          onSelectSlot={form.selectSlot}
          onSelectBooking={form.startEdit}
        />
      </section>

      <aside className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:sticky lg:top-6">
        <BookingForm
          form={form}
          editActions={
            editing && (
              <DeleteBookingButton
                key={editing.id}
                booking={editing}
                onDeleted={form.reset}
              />
            )
          }
        />
      </aside>
    </main>
  )
}
