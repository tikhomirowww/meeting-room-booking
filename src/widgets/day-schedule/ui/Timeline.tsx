import { isBookingLocked, type Booking, type TimeOption } from '@/entities/booking'
import { WORK_DAY_END, WORK_DAY_START } from '@/shared/config'
import { fromMinutes, minutesOfDay, toIsoDate, toMinutes, type HhMm, type IsoDate } from '@/shared/lib/time'

const DAY_START = toMinutes(WORK_DAY_START)
const DAY_END = toMinutes(WORK_DAY_END)
const SLOT_MINUTES = 30
const PX_PER_MINUTE = 1.6

type Draft = { start: HhMm | ''; end: HhMm | '' }

type Props = {
  date: IsoDate
  now: Date
  bookings: readonly Booking[]
  startOptions: readonly TimeOption[]
  selectedId?: string
  draft?: Draft
  onSelectSlot: (start: HhMm) => void
  onSelectBooking: (booking: Booking) => void
}

const top = (time: HhMm | number) =>
  ((typeof time === 'number' ? time : toMinutes(time)) - DAY_START) * PX_PER_MINUTE

export function Timeline({
  date,
  now,
  bookings,
  startOptions,
  selectedId,
  draft,
  onSelectSlot,
  onSelectBooking,
}: Props) {
  const today = toIsoDate(now)
  const pastUntil =
    date < today ? DAY_END : date > today ? DAY_START : Math.min(Math.max(minutesOfDay(now), DAY_START), DAY_END)
  const showNowLine = date === today && pastUntil > DAY_START && pastUntil < DAY_END

  const slots: number[] = []
  for (let m = DAY_START; m < DAY_END; m += SLOT_MINUTES) slots.push(m)

  const firstAvailableIn = (slotStart: number) =>
    startOptions.find((o) => {
      const m = toMinutes(o.value)
      return !o.disabled && m >= slotStart && m < slotStart + SLOT_MINUTES
    })?.value

  const showDraft = draft?.start && draft.end && toMinutes(draft.end) > toMinutes(draft.start)

  return (
    <div className="relative flex select-none" style={{ height: (DAY_END - DAY_START) * PX_PER_MINUTE }}>
      <div className="relative w-14 shrink-0 text-xs text-slate-500" aria-hidden="true">
        {slots
          .filter((m) => m % 60 === 0)
          .concat(DAY_END)
          .map((m) => (
            <span key={m} className="absolute right-3 -translate-y-1/2" style={{ top: top(m) }}>
              {fromMinutes(m)}
            </span>
          ))}
      </div>

      <div className="relative flex-1 overflow-hidden rounded-lg ring-1 ring-slate-200">
        <ul aria-label="Free time">
          {slots.map((m) => {
            const start = firstAvailableIn(m)
            const label = `${fromMinutes(m)}–${fromMinutes(m + SLOT_MINUTES)}`
            return (
              <li
                key={m}
                className={`absolute inset-x-0 border-t ${m % 60 === 0 ? 'border-slate-200' : 'border-dashed border-slate-100'}`}
                style={{ top: top(m), height: SLOT_MINUTES * PX_PER_MINUTE }}
              >
                {start && (
                  <button
                    type="button"
                    onClick={() => onSelectSlot(start)}
                    aria-label={`Book from ${start}`}
                    className="group size-full bg-white text-left text-xs text-transparent hover:bg-indigo-50 hover:text-indigo-700 focus-visible:bg-indigo-50 focus-visible:text-indigo-700"
                  >
                    <span className="pl-3">+ {start === fromMinutes(m) ? label : `from ${start}`}</span>
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {pastUntil > DAY_START && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 bg-slate-100/80 bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(226_232_240)_6px,rgb(226_232_240)_7px)]"
            style={{ height: top(pastUntil) }}
          />
        )}

        {showDraft && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-1 rounded-md border-2 border-dashed border-indigo-400 bg-indigo-100/60"
            style={{ top: top(draft.start), height: top(draft.end) - top(draft.start) }}
          />
        )}

        <ul aria-label="Bookings">
          {bookings.map((b) => {
            const locked = isBookingLocked(b, now)
            const selected = b.id === selectedId
            const height = top(b.end) - top(b.start)
            const text = `${b.start}–${b.end}${b.title ? ` · ${b.title}` : ''}`
            return (
              <li key={b.id} className="absolute inset-x-1" style={{ top: top(b.start) + 1, height: height - 2 }}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onSelectBooking(b)}
                  aria-pressed={selected}
                  aria-label={`${text}${locked ? ' (already started — cannot be changed)' : ', edit'}`}
                  className={`flex size-full flex-col overflow-hidden rounded-md px-3 py-1 text-left text-xs ring-1 transition-colors ${
                    locked
                      ? 'cursor-default bg-slate-200 text-slate-500 ring-slate-300'
                      : selected
                        ? 'bg-indigo-600 text-white ring-indigo-700'
                        : 'bg-indigo-100 text-indigo-900 ring-indigo-200 hover:bg-indigo-200'
                  }`}
                >
                  <span className="font-semibold">
                    {b.start}–{b.end}
                  </span>
                  {b.title && height > 30 && <span className="truncate">{b.title}</span>}
                </button>
              </li>
            )
          })}
        </ul>

        {showNowLine && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t-2 border-red-500"
            style={{ top: top(pastUntil) }}
          >
            <span className="absolute -top-1.5 -left-1 size-3 rounded-full bg-red-500" />
          </div>
        )}
      </div>
    </div>
  )
}
