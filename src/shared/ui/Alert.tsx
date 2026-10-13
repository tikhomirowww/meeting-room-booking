import type { ReactNode } from 'react'

type Tone = 'error' | 'warning' | 'info' | 'success'

const tones: Record<Tone, string> = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
}

type Props = { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode }

export function Alert({ tone = 'info', title, children, action }: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-2 rounded-lg p-3 text-sm ring-1 ${tones[tone]}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div>{children}</div>}
      {action && <div>{action}</div>}
    </div>
  )
}
