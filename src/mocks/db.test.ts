import { beforeEach, describe, expect, it, vi } from 'vitest'

function createStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  }
}

// Each import simulates the mock server running in a separate tab.
async function openTab() {
  vi.resetModules()
  return (await import('./db')).db
}

describe('mock db', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorage())
  })

  it('L-003: seed IDs are stable across reads', async () => {
    const db = await openTab()
    const first = db.all().map((b) => b.id)
    expect(first.length).toBeGreaterThan(0)
    expect(db.all().map((b) => b.id)).toEqual(first)
  })

  it('L-002: tabs see each other’s writes instead of overwriting them', async () => {
    const tabA = await openTab()
    const tabB = await openTab()

    tabA.insert({ id: 'a', date: '2030-05-16', start: '13:00', end: '14:00' })
    expect(tabB.find('a')).toBeDefined()

    tabB.insert({ id: 'b', date: '2030-05-16', start: '15:00', end: '16:00' })
    expect(tabA.all().map((b) => b.id)).toEqual(expect.arrayContaining(['a', 'b']))
  })

  it('keeps working in memory when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const db = await openTab()
    const ids = db.all().map((b) => b.id)
    expect(db.all().map((b) => b.id)).toEqual(ids)
  })
})
