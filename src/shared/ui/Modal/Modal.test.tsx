import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function setup(open: boolean, onClose = vi.fn()) {
  const utils = render(
    <Modal open={open} onClose={onClose} title="Delete booking?" actions={<button type="button">OK</button>}>
      This cannot be undone.
    </Modal>,
  )
  return { onClose, dialog: utils.container.querySelector('dialog')!, ...utils }
}

describe('Modal', () => {
  it('is closed when open=false', () => {
    const { dialog } = setup(false)
    expect(dialog.open).toBe(false)
  })

  it('opens as a labelled, described dialog', () => {
    setup(true)
    const dialog = screen.getByRole('dialog', { name: 'Delete booking?' })
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('closes when open switches to false', () => {
    const { dialog, rerender, onClose } = setup(true)
    rerender(
      <Modal open={false} onClose={onClose} title="Delete booking?" actions={null}>
        x
      </Modal>,
    )
    expect(dialog.open).toBe(false)
  })

  it('Esc (cancel event) asks the parent to close instead of closing itself', () => {
    const { dialog, onClose } = setup(true)
    const cancel = new Event('cancel', { cancelable: true })
    fireEvent(dialog, cancel)
    expect(cancel.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('a click on the backdrop closes, a click inside does not', async () => {
    const { dialog, onClose } = setup(true)
    await userEvent.click(screen.getByText('This cannot be undone.'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
