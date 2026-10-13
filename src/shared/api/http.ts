import { ApiError, NetworkError, type ApiErrorBody } from './errors'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new NetworkError()
  }

  if (response.status === 204) return undefined as T

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, toErrorBody(data, response.status))
  }
  return data as T
}

function toErrorBody(data: unknown, status: number): ApiErrorBody {
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    const code = 'code' in data && typeof data.code === 'string' ? data.code : `HTTP_${status}`
    return { code, message: data.message, details: 'details' in data ? data.details : undefined }
  }
  return { code: `HTTP_${status}`, message: 'The server returned an error. Please try again.' }
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string) => request<void>('DELETE', path),
}
