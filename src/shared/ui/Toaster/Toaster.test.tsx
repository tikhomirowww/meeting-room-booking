import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from './Toaster'
import { toast, toastStore } from './toastStore'

const region = () => screen.getByRole('list', { name: 'Notifications' })

describe('Toaster', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    act(() => toastStore.getSnapshot().forEach((t) => toastStore.dismiss(t.id)))
    vi.useRealTimers()
  })

  it('shows a toast in a polite live region', () => {
    render(<Toaster />)
    act(() => toast('Room booked', '13:00–14:00'))
    expect(region()).toHaveAttribute('aria-live', 'polite')
    expect(within(region()).getByText('Room booked')).toBeInTheDocument()
    expect(within(region()).getByText('13:00–14:00')).toBeInTheDocument()
  })

  it('disappears after 2 seconds', () => {
    render(<Toaster />)
    act(() => toast('Saved'))
    act(() => vi.advanceTimersByTime(1999))
    expect(screen.getByText('Saved')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('pauses while hovered', () => {
    render(<Toaster />)
    act(() => toast('Saved'))
    const item = screen.getByText('Saved').closest('li')!
    fireEvent.mouseEnter(item)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('Saved')).toBeInTheDocument()
    fireEvent.mouseLeave(item)
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('can be dismissed', () => {
    render(<Toaster />)
    act(() => toast('Saved'))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('keeps at most three toasts', () => {
    render(<Toaster />)
    act(() => ['1', '2', '3', '4'].forEach((t) => toast(`Toast ${t}`)))
    expect(within(region()).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
  })
})
