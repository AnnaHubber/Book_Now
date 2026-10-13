import { describe, expect, it } from 'vitest'
import { buildSlots, hasConflict, weekdayFor } from '../../api/lib/availability.js'
import { clockToMinutes, instantToWallClock, minutesToClock, wallClockToInstant } from '../../api/lib/timezone.js'

describe('clock helpers', () => {
  it('round-trips minutes and clock strings', () => {
    expect(minutesToClock(540)).toBe('09:00')
    expect(minutesToClock(1050)).toBe('17:30')
    expect(clockToMinutes('09:00')).toBe(540)
    expect(clockToMinutes('17:30')).toBe(1050)
  })
})

describe('weekdayFor', () => {
  it('matches the Monday-first index used by availability_rules', () => {
    expect(weekdayFor('2026-08-03')).toBe(0) // Monday
    expect(weekdayFor('2026-08-07')).toBe(4) // Friday
    expect(weekdayFor('2026-08-09')).toBe(6) // Sunday
  })
})

describe('timezone conversion', () => {
  it('resolves a Berlin summer wall-clock time to the right instant', () => {
    // Berlin is UTC+2 in August.
    expect(wallClockToInstant('2026-08-07 10:00', 'Europe/Berlin').toISOString()).toBe(
      '2026-08-07T08:00:00.000Z',
    )
  })

  it('resolves a Berlin winter wall-clock time to the right instant', () => {
    // ...and UTC+1 in January.
    expect(wallClockToInstant('2026-01-14 10:00', 'Europe/Berlin').toISOString()).toBe(
      '2026-01-14T09:00:00.000Z',
    )
  })

  it('round-trips an instant back to the studio wall clock', () => {
    const instant = wallClockToInstant('2026-01-14 10:00', 'Europe/Berlin')
    expect(instantToWallClock(instant, 'Europe/Berlin')).toBe('2026-01-14 10:00')
  })
})

describe('buildSlots', () => {
  const rules = [{ weekday: 4, opens_minute: 540, closes_minute: 1050 }]
  const service = { duration_minutes: 60, buffer_minutes: 0 }
  const past = new Date('2020-01-01T00:00:00Z')

  it('offers slots on the grid and never past closing time', () => {
    const slots = buildSlots({
      date: '2026-08-07',
      rules,
      service,
      bookings: [],
      timeOff: [],
      timezone: 'Europe/Berlin',
      now: past,
    })

    expect(slots.length).toBeGreaterThan(0)
    expect(slots[0].startsAt).toBe('2026-08-07 09:00')
    expect(slots.at(-1).endMinute).toBeLessThanOrEqual(1050)
  })

  it('blocks a slot that runs into an existing appointment', () => {
    const slots = buildSlots({
      date: '2026-08-07',
      rules,
      service,
      bookings: [{ ref: 'MRD-1', starts_at: '2026-08-07 10:00', ends_at: '2026-08-07 11:00' }],
      timeOff: [],
      timezone: 'Europe/Berlin',
      now: past,
    })

    const nineFortyFive = slots.find((s) => s.startsAt === '2026-08-07 09:45')
    expect(nineFortyFive.available).toBe(false)
  })
})

describe('hasConflict', () => {
  const existing = [{ starts_at: '2026-08-07 10:00', ends_at: '2026-08-07 11:00' }]

  it('accepts an appointment that finishes before the next one starts', () => {
    expect(hasConflict({ starts_at: '2026-08-07 09:00', ends_at: '2026-08-07 10:00' }, existing)).toBe(false)
  })

  it('rejects an appointment that starts inside an existing one', () => {
    expect(hasConflict({ starts_at: '2026-08-07 10:30', ends_at: '2026-08-07 11:30' }, existing)).toBe(true)
  })

  it('rejects a long appointment that swallows an existing one', () => {
    expect(hasConflict({ starts_at: '2026-08-07 09:30', ends_at: '2026-08-07 11:00' }, existing)).toBe(true)
  })
})
