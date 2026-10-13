import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { TITLE_MAX_LENGTH } from '@/entities/booking'
import { formatDuration, formatLongDate, toMinutes } from '@/shared/lib/time'
import { Alert, Button, Modal, Select } from '@/shared/ui'
import type { BookingFormModel } from '../../model/useBookingForm'

type Props = {
  form: BookingFormModel
  /** Slot for actions on the booking being edited (e.g. delete). */
  editActions?: ReactNode
}

export function BookingForm({ form, editActions }: Props) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // After picking a slot or booking: bring the form into view (it sits below the timeline on mobile) and focus the title.
  useEffect(() => {
    if (form.focusRequest === 0) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    formRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
    titleRef.current?.focus({ preventScroll: true })
  }, [form.focusRequest])

  const { values, mode, feedback, isReadOnlyDate, isSubmitting, hasFreeTime } = form
  const isEdit = mode.type === 'edit'
  const disabled = isReadOnlyDate || isSubmitting

  const requiredError = (field: 'start' | 'end') =>
    form.violations.find((v) => v.field === field && v.code === 'INVALID_FORMAT')?.message
  const startRequired = requiredError('start')
  // End can't be picked without a start, so its own error would be noise.
  const endRequired = values.start ? requiredError('end') : undefined
  const rangeError = form.violations.find(
    (v) => (v.field === 'start' || v.field === 'end') && v.code !== 'INVALID_FORMAT',
  )?.message
  const titleError = form.fieldError('title')
  const otherErrors = form.violations.filter((v) => v.field === 'date')

  const describedBy = (fieldErrorId: string | false) =>
    [fieldErrorId, rangeError && `${id}-range-error`].filter(Boolean).join(' ') || undefined

  // Past times are noise, so they're hidden. Booked ones stay visible with a reason, so gaps make sense.
  const startOptions = form.startOptions.filter((o) => o.reason !== 'past' || o.value === values.start)
  const endOptions = form.endOptions.filter((o) => !o.disabled || o.value === values.end)
  const startLabel = (o: (typeof startOptions)[number]) => (o.reason === 'booked' ? `${o.value} · booked` : o.value)
  const endLabel = (value: string) =>
    values.start && toMinutes(value) > toMinutes(values.start)
      ? `${value} · ${formatDuration(toMinutes(value) - toMinutes(values.start))}`
      : value

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.submit()
  }

  return (
    <form
      ref={formRef}
      id="booking-form"
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

      <Modal
        open={!!feedback}
        onClose={form.dismissFeedback}
        tone={feedback?.tone === 'error' ? 'danger' : 'warning'}
        title={feedback?.title ?? ''}
        actions={
          <Button onClick={form.dismissFeedback} autoFocus>
            Got it
          </Button>
        }
      >
        {feedback?.message}
      </Modal>

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

      <div className="grid grid-cols-2 items-start gap-3">
        <div>
          <label htmlFor={`${id}-start`} className="text-sm font-medium">
            Start
          </label>
          <Select
            id={`${id}-start`}
            value={values.start}
            onChange={(e) => form.setStart(e.target.value)}
            disabled={disabled}
            aria-invalid={!!startRequired || !!rangeError}
            aria-describedby={describedBy(!!startRequired && `${id}-start-error`)}
          >
            <option value="">—</option>
            {startOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {startLabel(o)}
              </option>
            ))}
          </Select>
          {startRequired && (
            <p id={`${id}-start-error`} className="mt-1 text-sm text-red-700">
              {startRequired}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-end`} className="text-sm font-medium">
            End
          </label>
          <Select
            id={`${id}-end`}
            value={values.end}
            onChange={(e) => form.setEnd(e.target.value)}
            disabled={disabled || !values.start}
            aria-invalid={!!endRequired || !!rangeError}
            aria-describedby={describedBy(!!endRequired && `${id}-end-error`)}
          >
            <option value="">—</option>
            {endOptions.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {endLabel(o.value)}
              </option>
            ))}
          </Select>
          {endRequired && (
            <p id={`${id}-end-error`} className="mt-1 text-sm text-red-700">
              {endRequired}
            </p>
          )}
        </div>
      </div>

      {rangeError && (
        <p id={`${id}-range-error`} className="-mt-2 text-sm text-red-700">
          {rangeError}
        </p>
      )}

      <div>
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Title <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          type="text"
          value={values.title}
          onChange={(e) => form.setTitle(e.target.value)}
          disabled={disabled}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="e.g. Sprint planning"
          aria-invalid={!!titleError}
          className="mt-1 block w-full rounded-lg border-0 px-3 py-2 text-sm ring-1 ring-slate-300 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100"
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
