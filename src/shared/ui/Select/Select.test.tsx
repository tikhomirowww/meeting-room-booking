import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

describe('Select', () => {
  it('is a native select that forwards props and changes', async () => {
    const onChange = vi.fn()
    render(
      <label>
        Start
        <Select value="" onChange={onChange} aria-invalid>
          <option value="">—</option>
          <option value="09:00">09:00</option>
        </Select>
      </label>,
    )
    const select = screen.getByRole('combobox', { name: 'Start' })
    expect(select).toHaveAttribute('aria-invalid', 'true')
    await userEvent.selectOptions(select, '09:00')
    expect(onChange).toHaveBeenCalled()
  })

  it('the chevron icon is hidden from assistive tech', () => {
    const { container } = render(<Select />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
