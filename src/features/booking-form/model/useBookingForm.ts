import { useMemo, useState } from 'react'
import {
  getEndOptions,
  getStartOptions,
  isBookingLocked,
  isPastDate,
  suggestEnd,
  validateBooking,
  type Booking,
  type BookingInput,
} from '@/entities/booking'
import { getErrorMessage, isConflictError, isNotFoundError } from '@/shared/api'
import type { HhMm, IsoDate } from '@/shared/lib/time'
import { useSaveBooking } from './useSaveBooking'

export type BookingFormValues = { start: HhMm | ''; end: HhMm | ''; title: string }

export type BookingFormMode = { type: 'create' } | { type: 'edit'; booking: Booking }

export type FormFeedback =
  | { tone: 'error' | 'warning'; title: string; message: string }
  | { tone: 'success'; title: string; message?: string }

const EMPTY: BookingFormValues = { start: '', end: '', title: '' }

type Params = { date: IsoDate; bookings: readonly Booking[]; now: Date }

export function useBookingForm({ date, bookings, now }: Params) {
  const [mode, setMode] = useState<BookingFormMode>({ type: 'create' })
  const [values, setValues] = useState<BookingFormValues>(EMPTY)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [feedback, setFeedback] = useState<FormFeedback | null>(null)
  const save = useSaveBooking()

  const excludeId = mode.type === 'edit' ? mode.booking.id : undefined
  const ctx = useMemo(() => ({ bookings, now, excludeId }), [bookings, now, excludeId])

  const isReadOnlyDate = isPastDate(date, now)
  const startOptions = useMemo(() => getStartOptions(date, ctx), [date, ctx])
  const endOptions = useMemo(
    () => (values.start ? getEndOptions(date, values.start, ctx) : []),
    [date, values.start, ctx],
  )
  const hasFreeTime = startOptions.some((o) => !o.disabled)

  const input: BookingInput = {
    date,
    start: values.start,
    end: values.end,
    title: values.title.trim() || undefined,
  }
  const violations = validateBooking(input, ctx)
  const showErrors = submitAttempted || (values.start !== '' && values.end !== '')
  const visibleViolations = showErrors ? violations : []

  function fieldError(field: 'start' | 'end' | 'title') {
    return visibleViolations.find((v) => v.field === field)?.message
  }

  function setStart(start: HhMm | '') {
    setFeedback(null)
    setValues((prev) => {
      if (!start) return { ...prev, start, end: '' }
      const endStillValid = getEndOptions(date, start, ctx).some((o) => o.value === prev.end && !o.disabled)
      return { ...prev, start, end: endStillValid ? prev.end : suggestEnd(date, start, ctx) }
    })
  }

  function setEnd(end: HhMm | '') {
    setFeedback(null)
    setValues((prev) => ({ ...prev, end }))
  }

  function setTitle(title: string) {
    setValues((prev) => ({ ...prev, title }))
  }

  /** Clicking a free slot fills in the time and keeps the entered title. */
  function selectSlot(start: HhMm) {
    setFeedback(null)
    setSubmitAttempted(false)
    setValues((prev) => ({ ...prev, start, end: suggestEnd(date, start, ctx) }))
  }

  function startEdit(booking: Booking) {
    if (isBookingLocked(booking, now)) return
    setMode({ type: 'edit', booking })
    setValues({ start: booking.start, end: booking.end, title: booking.title ?? '' })
    setSubmitAttempted(false)
    setFeedback(null)
  }

  function reset(nextFeedback: FormFeedback | null = null) {
    setMode({ type: 'create' })
    setValues(EMPTY)
    setSubmitAttempted(false)
    setFeedback(nextFeedback)
  }

  function submit() {
    setSubmitAttempted(true)
    setFeedback(null)
    if (violations.length > 0 || isReadOnlyDate || save.isPending) return

    const id = mode.type === 'edit' ? mode.booking.id : undefined
    const payload: BookingInput = { ...input, title: values.title.trim() }

    save.mutate(
      { id, input: payload },
      {
        onSuccess: (booking) =>
          reset({
            tone: 'success',
            title: id ? 'Booking updated' : 'Room booked',
            message: `${booking.start}–${booking.end}${booking.title ? ` · ${booking.title}` : ''}`,
          }),
        onError: (error) => {
          if (isConflictError(error)) {
            setFeedback({
              tone: 'warning',
              title: 'This slot was just taken',
              message: 'Someone booked this slot while you were filling in the form. The schedule has been refreshed — pick another time; your input is kept.',
            })
          } else if (isNotFoundError(error) && id) {
            setMode({ type: 'create' })
            setFeedback({
              tone: 'warning',
              title: 'This booking no longer exists',
              message: 'It was deleted. Your input is kept — you can create a new booking.',
            })
          } else {
            setFeedback({ tone: 'error', title: 'Could not save', message: getErrorMessage(error) })
          }
        },
      },
    )
  }

  return {
    date,
    mode,
    values,
    feedback,
    violations: visibleViolations,
    fieldError,
    startOptions,
    endOptions,
    hasFreeTime,
    isReadOnlyDate,
    isSubmitting: save.isPending,
    setStart,
    setEnd,
    setTitle,
    selectSlot,
    startEdit,
    reset,
    submit,
  }
}

export type BookingFormModel = ReturnType<typeof useBookingForm>
