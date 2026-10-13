import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('errors are announced immediately (role="alert")', () => {
    render(<Alert tone="error" title="Could not load">Try again</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not load')
    expect(alert).toHaveTextContent('Try again')
  })

  it.each(['info', 'warning', 'success'] as const)('%s is a polite status', (tone) => {
    render(<Alert tone={tone}>Message</Alert>)
    expect(screen.getByRole('status')).toHaveTextContent('Message')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders an action', () => {
    render(<Alert action={<button type="button">Retry</button>}>Failed</Alert>)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
