import { BookingPage } from '@/pages/booking'
import { Toaster } from '@/shared/ui'
import { QueryProvider } from './providers/QueryProvider'

export function App() {
  return (
    <QueryProvider>
      <BookingPage />
      <Toaster />
    </QueryProvider>
  )
}
