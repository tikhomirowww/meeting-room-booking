import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { bookingKeys } from '@/entities/booking'
import { Button } from '@/shared/ui'
import { mockControls, type MockScenario } from '@/mocks/controls'
import { db } from '@/mocks/db'

const scenarios: { key: MockScenario; label: string; hint: string }[] = [
  {
    key: 'conflictOnNextWrite',
    label: 'Conflict on next save',
    hint: 'The server books the slot for another user first and responds with 409.',
  },
  {
    key: 'readsFail',
    label: 'Schedule requests fail',
    hint: 'GET /api/bookings responds with 500 while enabled. Change the date to see the error state.',
  },
]

function useScenario(key: MockScenario) {
  return useSyncExternalStore(mockControls.subscribe, () => mockControls.get(key))
}

function ScenarioToggle({ scenario }: { scenario: (typeof scenarios)[number] }) {
  const enabled = useScenario(scenario.key)
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => mockControls.set(scenario.key, e.target.checked)}
        className="mt-0.5 size-4 accent-indigo-600"
      />
      <span>
        <span className="block text-sm font-medium">{scenario.label}</span>
        <span className="block text-xs text-slate-500">{scenario.hint}</span>
      </span>
    </label>
  )
}

export function MockControlsPanel() {
  const queryClient = useQueryClient()

  return (
    <details className="rounded-xl bg-white p-4 text-sm ring-1 ring-slate-200">
      <summary className="cursor-pointer font-medium text-slate-700">Mock API demo scenarios</summary>
      <div className="mt-3 flex flex-col gap-3">
        {scenarios.map((s) => (
          <ScenarioToggle key={s.key} scenario={s} />
        ))}
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => {
            db.reset()
            void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
          }}
        >
          Reset demo data
        </Button>
      </div>
    </details>
  )
}
