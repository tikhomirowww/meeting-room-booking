import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { setupMockApi } from '@/test/server'
import { App } from './App'

setupMockApi()

describe('App', () => {
  it('wires providers, the page and the toast region', async () => {
    render(<App />)
    expect(await screen.findByRole('list', { name: 'Bookings' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Notifications' })).toBeInTheDocument()
  })
})
