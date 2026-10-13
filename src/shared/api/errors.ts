export type ApiErrorBody = {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details
  }
}

export class NetworkError extends Error {
  constructor() {
    super('Cannot reach the server. Check your connection and try again.')
    this.name = 'NetworkError'
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError
export const isConflictError = (e: unknown): e is ApiError => isApiError(e) && e.status === 409
export const isNotFoundError = (e: unknown): e is ApiError => isApiError(e) && e.status === 404

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return 'Something went wrong. Please try again.'
}
