import { describe, expect, it } from 'vitest'
import { convertWallClock, offsetBetween, shiftClock } from '../../src/lib/timezone.js'

describe('shiftClock', () => {
  it('moves a clock reading forward and back', () => {
    expect(shiftClock('10:00', 3)).toEqual({ clock: '13:00', dayShift: 0 })
    expect(shiftClock('10:00', -3)).toEqual({ clock: '07:00', dayShift: 0 })
  })

  it('reports crossing midnight', () => {
    expect(shiftClock('23:30', 2)).toEqual({ clock: '01:30', dayShift: 1 })
    expect(shiftClock('00:30', -2)).toEqual({ clock: '22:30', dayShift: -1 })
  })

  it('handles half-hour zones', () => {
    expect(shiftClock('10:00', 5.5)).toEqual({ clock: '15:30', dayShift: 0 })
  })
})

describe('convertWallClock', () => {
  it('converts a winter appointment from Berlin to UTC', () => {
    // Berlin runs UTC+1 in January.
    expect(convertWallClock('2026-01-14 10:00', 'Europe/Berlin', 'UTC').clock).toBe('09:00')
  })

  it('converts a summer appointment from Berlin to UTC', () => {
    // ...and UTC+2 once summer time starts.
    expect(convertWallClock('2026-08-07 10:00', 'Europe/Berlin', 'UTC').clock).toBe('08:00')
  })
})

describe('offsetBetween', () => {
  it('is zero between a zone and itself', () => {
    expect(offsetBetween('Asia/Tokyo', 'Asia/Tokyo')).toBe(0)
  })
})
