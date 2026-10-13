import { http as mock, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ApiError, getErrorMessage, isConflictError, isNotFoundError, NetworkError } from './errors'
import { http } from './http'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('http client', () => {
  it('returns parsed JSON on success and sends a JSON body', async () => {
    server.use(mock.post('*/x', async ({ request }) => HttpResponse.json({ got: await request.json() })))
    expect(await http.post('/x', { a: 1 })).toEqual({ got: { a: 1 } })
  })

  it('returns undefined for 204', async () => {
    server.use(mock.delete('*/x', () => new HttpResponse(null, { status: 204 })))
    expect(await http.delete('/x')).toBeUndefined()
  })

  it('throws a typed ApiError with the server code and message', async () => {
    server.use(mock.post('*/x', () => HttpResponse.json({ code: 'CONFLICT', message: 'Taken' }, { status: 409 })))
    const error = await http.post('/x', {}).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(isConflictError(error)).toBe(true)
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT', message: 'Taken' })
  })

  it('handles non-JSON error bodies (e.g. a 404 from a static host)', async () => {
    server.use(mock.get('*/x', () => new HttpResponse('Not Found', { status: 404 })))
    const error = await http.get('/x').catch((e: unknown) => e)
    expect(isNotFoundError(error)).toBe(true)
    expect(error).toMatchObject({ code: 'HTTP_404' })
    expect(getErrorMessage(error)).toMatch(/server returned an error/i)
  })

  it('throws NetworkError when the request fails', async () => {
    server.use(mock.get('*/x', () => HttpResponse.error()))
    const error = await http.get('/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NetworkError)
    expect(getErrorMessage(error)).toMatch(/cannot reach the server/i)
  })

  it('gives a generic message for unknown errors', () => {
    expect(getErrorMessage(new Error('boom'))).toMatch(/something went wrong/i)
  })
})
