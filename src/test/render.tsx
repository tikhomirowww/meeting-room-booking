import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'

export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

/** Render with a fresh QueryClient and a userEvent instance. */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = createTestQueryClient()
  const user = userEvent.setup()
  return { user, queryClient, ...render(ui, { wrapper: wrapperFor(queryClient), ...options }) }
}

export function renderHookWithProviders<T>(hook: () => T) {
  const queryClient = createTestQueryClient()
  return { queryClient, ...renderHook(hook, { wrapper: wrapperFor(queryClient) }) }
}
