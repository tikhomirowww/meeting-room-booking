/**
 * Probes for the boundary checker: every known way around invariants 2 and 8 must be caught
 * (lesson L-013), and legitimate imports must pass.
 */
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module without type declarations
import { checkFile, checkProject } from './check-boundaries.mjs'

type Violation = { message: string }
const check = (file: string, source: string): Violation[] => checkFile({ file, source })
const RULES = 'entities/booking/model/rules.ts'
const FORM_MODEL = 'features/booking-form/model/useBookingForm.ts'
const FORM_UI = 'features/booking-form/ui/BookingForm/BookingForm.tsx'

describe('invariant 2: business rules are pure (allowlist)', () => {
  it.each([
    ["import { http } from '@/shared/api'"],
    ["import { http } from '@/shared/api/http'"],
    ["import { bookingApi } from '../api/bookingApi'"],
    ["import { bookingApi } from '../api'"],
    ["import { useState } from 'react'"],
    ["import { useQuery } from '@tanstack/react-query'"],
    ["import { db } from '../../../mocks/db'"],
    ["import { db } from '@/mocks/db'"],
    ["export { x } from '@/shared/ui'"],
    ["const lazy = () => import('@/shared/api/http')"],
  ])('rejects %s', (source) => {
    expect(check(RULES, source)).toHaveLength(1)
  })

  it.each([['const now = new Date()'], ['const t = Date.now()'], ['const d = new Date(2030, 4, 15)'], ['Date.parse(x)']])(
    'rejects Date as a value: %s',
    (source) => {
      expect(check(RULES, source)).toHaveLength(1)
    },
  )

  it('accepts shared/config, shared/lib/*, its own folder and Date as a type', () => {
    const source = `
      import { WORK_DAY_START } from '@/shared/config'
      import { toMinutes } from '@/shared/lib/time'
      import type { Booking } from './types'
      export type Ctx = { now: Date }
      // new Date() in a comment is fine
    `
    expect(check(RULES, source)).toEqual([])
  })
})

describe('invariant 8: FSD boundaries', () => {
  it.each([
    ['upward with alias', 'entities/booking/api/queries.ts', "import { BookingForm } from '@/features/booking-form'"],
    ['upward with a relative path', 'entities/booking/api/queries.ts', "import { BookingForm } from '../../../features/booking-form'"],
    ['shared importing entities', 'shared/lib/time/time.ts', "import { bookingKeys } from '@/entities/booking'"],
    ['same-layer slice with alias', FORM_MODEL, "import { DeleteBookingButton } from '@/features/booking-delete'"],
    ['same-layer slice with a relative path', FORM_MODEL, "import { DeleteBookingButton } from '../../booking-delete'"],
    ['deep into an entity', FORM_MODEL, "import { bookingApi } from '@/entities/booking/api'"],
    ['deep into shared/ui', FORM_UI, "import { toastStore } from '@/shared/ui/Toaster/toastStore'"],
    ['deep into shared/api', FORM_MODEL, "import { request } from '@/shared/api/http'"],
    ['deep into shared/lib', FORM_MODEL, "import { toMinutes } from '@/shared/lib/time/time'"],
    ['mocks with alias', FORM_MODEL, "import { db } from '@/mocks/db'"],
    ['mocks with a relative path', FORM_UI, "import { db } from '../../../../mocks/db'"],
    ['test helpers from app code', FORM_MODEL, "import { server } from '@/test/server'"],
    ['a widget importing a widget', 'widgets/day-schedule/ui/Timeline/Timeline.tsx', "import { X } from '@/widgets/other'"],
    ['a page importing app', 'pages/booking/ui/BookingPage/BookingPage.tsx', "import { App } from '@/app/App'"],
    ['a relative path that leaves src/', 'features/booking-form/ui/x.ts', "import { db } from '../../../../mocks/db'"],
  ])('rejects %s', (_, file, source) => {
    expect(check(file, source)).toHaveLength(1)
  })

  it.each([
    ['public APIs of lower layers', FORM_MODEL, "import { useBookingsQuery } from '@/entities/booking'\nimport { toast } from '@/shared/ui'\nimport { toMinutes } from '@/shared/lib/time'"],
    ['relative imports inside the slice', FORM_UI, "import type { BookingFormModel } from '../../model/useBookingForm'"],
    ['shared segments importing each other through the public API', 'shared/ui/Button/Button.tsx', "import { Spinner } from '../Spinner'\nimport { toIsoDate } from '@/shared/lib/time'"],
    ['the demo panel talking to mocks', 'features/mock-controls/ui/MockControlsPanel/MockControlsPanel.tsx', "import { db } from '@/mocks/db'"],
    ['app composing pages', 'app/App.tsx', "import { BookingPage } from '@/pages/booking'"],
  ])('accepts %s', (_, file, source) => {
    expect(check(file, source)).toEqual([])
  })

  it('ignores tests and code outside the layers', () => {
    expect(check('features/booking-form/model/useBookingForm.test.tsx', "import { db } from '@/mocks/db'")).toEqual([])
    expect(check('mocks/handlers.ts', "import { validateBooking } from '@/entities/booking/model'")).toEqual([])
  })
})

it('the real project has no violations', () => {
  expect(checkProject(path.resolve(__dirname, '..'))).toEqual([])
})
