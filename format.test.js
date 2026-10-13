import { describe, expect, it } from 'vitest'
import { clockOf, describeDate, formatDuration, formatPrice, initials, longDate } from '../../src/lib/format.js'

describe('formatDuration', () => {
  it('reads naturally at every length we sell', () => {
    expect(formatDuration(30)).toBe('30 min')
    expect(formatDuration(60)).toBe('1 hr')
    expect(formatDuration(75)).toBe('1 hr 15 min')
    expect(formatDuration(90)).toBe('1 hr 30 min')
  })
})

describe('formatPrice', () => {
  it('renders minor units as whole euros', () => {
    expect(formatPrice(9500)).toContain('95')
    expect(formatPrice(14000)).toContain('140')
  })
})

describe('describeDate', () => {
  it('names the weekday Monday-first', () => {
    expect(describeDate('2026-08-03').weekday).toBe('Mon')
    expect(describeDate('2026-08-07').weekday).toBe('Fri')
    expect(describeDate('2026-08-09').weekday).toBe('Sun')
  })

  it('formats a long date', () => {
    expect(longDate('2026-08-07')).toBe('Fri 7 Aug 2026')
  })
})

describe('misc', () => {
  it('pulls the clock out of a wall-clock string', () => {
    expect(clockOf('2026-08-07 14:45')).toBe('14:45')
  })

  it('builds initials', () => {
    expect(initials('Ilse Vermeer')).toBe('IV')
  })
})
