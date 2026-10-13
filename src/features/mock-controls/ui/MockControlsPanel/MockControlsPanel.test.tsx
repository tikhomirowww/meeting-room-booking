import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { mockControls } from '@/mocks/controls'
import { db } from '@/mocks/db'
import { renderWithProviders } from '@/test/render'
import { TOMORROW, setupMockApi } from '@/test/server'
import { MockControlsPanel } from './MockControlsPanel'

setupMockApi()

describe('MockControlsPanel', () => {
  it('toggles the demo scenarios', async () => {
    const { user } = renderWithProviders(<MockControlsPanel />)
    await user.click(screen.getByText('Mock API demo scenarios'))

    const conflict = screen.getByRole('checkbox', { name: /Conflict on next save/ })
    await user.click(conflict)
    expect(mockControls.get('conflictOnNextWrite')).toBe(true)

    await user.click(screen.getByRole('checkbox', { name: /Schedule requests fail/ }))
    expect(mockControls.get('readsFail')).toBe(true)
  })

  it('reflects scenario changes made elsewhere', async () => {
    const { user } = renderWithProviders(<MockControlsPanel />)
    await user.click(screen.getByText('Mock API demo scenarios'))
    const conflict = screen.getByRole('checkbox', { name: /Conflict on next save/ })
    expect(conflict).not.toBeChecked()
    mockControls.set('conflictOnNextWrite', true)
    expect(await screen.findByRole('checkbox', { name: /Conflict on next save/, checked: true })).toBeInTheDocument()
  })

  it('resets demo data', async () => {
    db.remove(db.byDate(TOMORROW)[0]!.id)
    const { user } = renderWithProviders(<MockControlsPanel />)
    await user.click(screen.getByText('Mock API demo scenarios'))
    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(db.byDate(TOMORROW)).toHaveLength(1)
  })
})
