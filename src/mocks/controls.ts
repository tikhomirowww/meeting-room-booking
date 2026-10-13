/**
 * Toggles for demonstrating server-side scenarios.
 * conflictOnNextWrite fires once; readsFail stays active while enabled.
 */
export type MockScenario = 'conflictOnNextWrite' | 'readsFail'

const state: Record<MockScenario, boolean> = {
  conflictOnNextWrite: false,
  readsFail: false,
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export const mockControls = {
  get: (scenario: MockScenario) => state[scenario],
  set(scenario: MockScenario, value: boolean) {
    state[scenario] = value
    notify()
  },
  /** Returns true if the scenario was enabled, and disables it. */
  consume(scenario: MockScenario): boolean {
    if (!state[scenario]) return false
    state[scenario] = false
    notify()
    return true
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
