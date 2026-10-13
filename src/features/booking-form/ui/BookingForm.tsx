import { useId, type FormEvent, type ReactNode } from 'react'
import { TITLE_MAX_LENGTH } from '@/entities/booking'
import { formatDuration, formatLongDate, toMinutes } from '@/shared/lib/time'
import { Alert, Button } from '@/shared/ui'
import type { BookingFormModel } from '../model/useBookingForm'

type Props = {
  form: BookingFormModel
  /** Slot for actions on the booking being edited (e.g. delete). */
  editActions?: ReactNode
}

const selectClass =
  'mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-400 aria-invalid:ring-red-400'

export function BookingForm({ form, editActions }: Props) {
  const id = useId()
  const { values, mode, feedback, isReadOnlyDate, isSubmitting, hasFreeTime } = form
  const isEdit = mode.type === 'edit'
  const disabled = isReadOnlyDate || isSubmitting

  const startError = form.fieldError('start')
  const endError = form.fieldError('end')
  const titleError = form.fieldError('title')
  const otherErrors = form.violations.filter((v) => v.field === 'date')

  const duration =
    values.start && values.end && toMinutes(values.end) > toMinutes(values.start)
      ? formatDuration(toMinutes(values.end) - toMinutes(values.start))
      : null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.submit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${id}-heading`}
      aria-busy={isSubmitting}
      className="flex flex-col gap-4"
    >
      <div>
        <h2 id={`${id}-heading`} className="text-lg font-semibold">
          {isEdit ? 'Edit booking' : 'New booking'}
        </h2>
        <p className="text-sm text-slate-500 first-letter:uppercase">{formatLongDate(form.date)}</p>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {feedback && (
          <Alert tone={feedback.tone} title={feedback.title}>
            {feedback.message}
          </Alert>
        )}
      </div>

      {isReadOnlyDate && (
        <Alert tone="info">This date is in the past — booking is unavailable. Pick today or a future date.</Alert>
      )}
      {!isReadOnlyDate && !hasFreeTime && !isEdit && (
        <Alert tone="info">No free time left on this date.</Alert>
      )}
      {otherErrors.map((v) => (
        <Alert key={v.code} tone="error">
          {v.message}
        </Alert>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-start`} className="text-sm font-medium">
            Start
          </label>
          <select
            id={`${id}-start`}
            value={values.start}
            onChange={(e) => form.setStart(e.target.value)}
            disabled={disabled}
            aria-invalid={!!startError}
            aria-describedby={startError ? `${id}-start-error` : undefined}
            className={selectClass}
          >
            <option value="">—</option>
            {form.startOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-end`} className="text-sm font-medium">
            End
          </label>
          <select
            id={`${id}-end`}
            value={values.end}
            onChange={(e) => form.setEnd(e.target.value)}
            disabled={disabled || !values.start}
            aria-invalid={!!endError}
            aria-describedby={endError ? `${id}-end-error` : undefined}
            className={selectClass}
          >
            <option value="">—</option>
            {form.endOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(startError || endError) && (
        <ul className="-mt-2 space-y-1 text-sm text-red-700">
          {startError && <li id={`${id}-start-error`}>{startError}</li>}
          {endError && endError !== startError && <li id={`${id}-end-error`}>{endError}</li>}
        </ul>
      )}
      {duration && !startError && !endError && (
        <p className="-mt-2 text-sm text-slate-500">Duration: {duration}</p>
      )}

      <div>
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Title <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id={`${id}-title`}
          type="text"
          value={values.title}
          onChange={(e) => form.setTitle(e.target.value)}
          disabled={disabled}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="e.g. Sprint planning"
          aria-invalid={!!titleError}
          className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
        />
        {titleError && <p className="mt-1 text-sm text-red-700">{titleError}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isSubmitting} disabled={isReadOnlyDate} className="flex-1">
          {isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Book'}
        </Button>
        {(isEdit || values.start || values.title) && (
          <Button variant="secondary" onClick={() => form.reset()} disabled={isSubmitting}>
            {isEdit ? 'Cancel' : 'Clear'}
          </Button>
        )}
      </div>

      {isEdit && editActions}
    </form>
  )
}
