import { useEffect, useId, useRef, type ReactNode } from 'react'

type Tone = 'default' | 'warning' | 'danger'

const toneIcon: Record<Tone, string | null> = {
  default: null,
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
}

type Props = {
  open: boolean
  onClose: () => void
  title: string
  tone?: Tone
  children?: ReactNode
  actions: ReactNode
}

export function Modal({ open, onClose, title, tone = 'default', children, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={children ? `${id}-body` : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex gap-4 p-6">
        {toneIcon[tone] && (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${toneIcon[tone]}`} aria-hidden="true">
            !
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          {children && (
            <div id={`${id}-body`} className="text-sm text-slate-600">
              {children}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 rounded-b-2xl bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">{actions}</div>
    </dialog>
  )
}
