import { BookingPage } from '@/pages/booking'
import { QueryProvider } from './providers/QueryProvider'

export function App() {
  return (
    <QueryProvider>
      <BookingPage />
    </QueryProvider>
  )
}
