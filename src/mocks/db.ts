import type { Booking } from '@/entities/booking/model'
import { addDays, toIsoDate } from '@/shared/lib/time'

const STORAGE_KEY = 'mock-db:bookings:v2'

function seed(): Booking[] {
  const today = toIsoDate(new Date())
  const tomorrow = addDays(today, 1)
  return [
    { id: crypto.randomUUID(), date: today, start: '10:00', end: '11:00', title: 'Team daily' },
    { id: crypto.randomUUID(), date: today, start: '14:00', end: '15:30', title: 'Design review' },
    { id: crypto.randomUUID(), date: tomorrow, start: '11:00', end: '12:00', title: 'Interview' },
  ]
}

function read(): Booking[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Booking[]) : null
  } catch {
    return null
  }
}

function write(data: Booking[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage unavailable — keep data in memory
  }
}

let bookings: Booking[] = read() ?? seed()
write(bookings)

// MSW runs separately in each tab: re-read storage so tabs see each other's changes.
function sync(): Booking[] {
  bookings = read() ?? bookings
  return bookings
}

function commit(next: Booking[]) {
  bookings = next
  write(next)
}

export const db = {
  all: (): Booking[] => sync(),
  byDate: (date: string): Booking[] => sync().filter((b) => b.date === date),
  find: (id: string): Booking | undefined => sync().find((b) => b.id === id),
  insert(booking: Booking): Booking {
    commit([...sync(), booking])
    return booking
  },
  replace(booking: Booking): Booking {
    commit(sync().map((b) => (b.id === booking.id ? booking : b)))
    return booking
  },
  remove(id: string) {
    commit(sync().filter((b) => b.id !== id))
  },
  reset() {
    commit(seed())
  },
}
