import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeekStrip } from '../../src/components/WeekStrip.jsx'

function dayNumbers(container) {
  return [...container.querySelectorAll('.day-number')].map((node) => node.textContent)
}

describe('WeekStrip', () => {
  it('shows the Monday-to-Sunday week around a midweek date', () => {
    const { container } = render(
      <WeekStrip date="2026-08-05" today="2026-08-01" onChange={vi.fn()} />,
    )
    expect(dayNumbers(container)).toEqual(['3', '4', '5', '6', '7', '8', '9'])
  })

  it('keeps a Sunday in the week it belongs to', () => {
    const { container } = render(
      <WeekStrip date="2026-08-09" today="2026-08-01" onChange={vi.fn()} />,
    )
    expect(dayNumbers(container)).toEqual(['3', '4', '5', '6', '7', '8', '9'])
  })

  it('marks the selected day', () => {
    render(<WeekStrip date="2026-08-05" today="2026-08-01" onChange={vi.fn()} />)
    const selected = screen.getByRole('button', { pressed: true })
    expect(selected).toHaveTextContent('5')
  })
})
