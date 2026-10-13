import { addDays, formatLongDate, isValidDate, toIsoDate, type IsoDate } from '@/shared/lib/time'
import { Button } from '@/shared/ui'

type Props = { date: IsoDate; now: Date; onChange: (date: IsoDate) => void }

export function DateNavigator({ date, now, onChange }: Props) {
  const today = toIsoDate(now)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button variant="secondary" onClick={() => onChange(addDays(date, -1))} aria-label="Previous day" className="px-3">
          ←
        </Button>
        <Button variant="secondary" onClick={() => onChange(today)} disabled={date === today}>
          Today
        </Button>
        <Button variant="secondary" onClick={() => onChange(addDays(date, 1))} aria-label="Next day" className="px-3">
          →
        </Button>
      </div>
      <label className="flex items-center gap-2">
        <span className="sr-only">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => isValidDate(e.target.value) && onChange(e.target.value)}
          className="min-h-10 rounded-lg border-0 bg-white px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-600"
        />
      </label>
      <p className="w-full text-xl font-semibold first-letter:uppercase sm:ml-2 sm:w-auto" aria-live="polite">
        {formatLongDate(date)}
      </p>
    </div>
  )
}
