import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDuration,
  fromMinutes,
  isValidDate,
  isValidTime,
  parseIsoDate,
  toIsoDate,
  toMinutes,
} from './time'

describe('time', () => {
  it('validates HH:mm', () => {
    expect(isValidTime('09:00')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
    expect(isValidTime('9:00')).toBe(false)
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime(900)).toBe(false)
  })

  it('validates real calendar dates', () => {
    expect(isValidDate('2030-05-15')).toBe(true)
    expect(isValidDate('2028-02-29')).toBe(true)
    expect(isValidDate('2030-02-29')).toBe(false)
    expect(isValidDate('2030-13-01')).toBe(false)
    expect(isValidDate('15.05.2030')).toBe(false)
  })

  it('converts between HH:mm and minutes', () => {
    expect(toMinutes('10:30')).toBe(630)
    expect(fromMinutes(630)).toBe('10:30')
    expect(fromMinutes(toMinutes('09:05'))).toBe('09:05')
  })

  it('works with local dates, not UTC', () => {
    const d = parseIsoDate('2030-05-15')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2030, 4, 15, 0])
    expect(toIsoDate(new Date(2030, 4, 15, 23, 59))).toBe('2030-05-15')
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2030-05-31', 1)).toBe('2030-06-01')
    expect(addDays('2030-01-01', -1)).toBe('2029-12-31')
  })

  it('formats durations', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
  })
})
