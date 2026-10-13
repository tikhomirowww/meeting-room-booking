import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('is a non-submitting button by default and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('can be a submit button', () => {
    render(<Button type="submit">Book</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('while loading: disabled, aria-busy, shows a spinner and ignores clicks', async () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelector('svg')).toBeInTheDocument()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies the variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
  })
})
