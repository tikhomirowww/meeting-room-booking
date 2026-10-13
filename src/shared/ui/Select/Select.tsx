import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className = '', children, ...rest }: Props) {
  return (
    <div className={`relative mt-1 ${className}`}>
      <select
        className="block w-full appearance-none rounded-lg border-0 bg-white py-2 pr-10 pl-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100 disabled:text-slate-500 aria-invalid:ring-red-400"
        {...rest}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}
