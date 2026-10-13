import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DateNavigator } from './DateNavigator'

const NOW = new Date(2030, 4, 15, 10, 5)

function setup(date = '2030-05-15') {
  const onChange = vi.fn()
  render(<DateNavigator date={date} now={NOW} onChange={onChange} />)
  return { onChange }
}

describe('DateNavigator', () => {
  it('is a navigation landmark showing the long date', () => {
    setup()
    expect(screen.getByRole('navigation', { name: 'Choose day' })).toBeInTheDocument()
    expect(screen.getByText('Wednesday, May 15')).toBeInTheDocument()
  })

  it('moves one day back and forward', async () => {
    const { onChange } = setup('2030-05-31')
    await userEvent.click(screen.getByRole('button', { name: 'Next day' }))
    expect(onChange).toHaveBeenLastCalledWith('2030-06-01')
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(onChange).toHaveBeenLastCalledWith('2030-05-30')
  })

  it('"Today" is disabled when already on today', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled()
  })

  it('"Today" returns to the current date', async () => {
    const { onChange } = setup('2030-06-20')
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(onChange).toHaveBeenCalledWith('2030-05-15')
  })

  it('accepts a picked date and ignores an invalid one', () => {
    const { onChange } = setup()
    const input = screen.getByLabelText('Date')
    fireEvent.change(input, { target: { value: '2030-07-01' } })
    expect(onChange).toHaveBeenCalledWith('2030-07-01')
    onChange.mockClear()
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
