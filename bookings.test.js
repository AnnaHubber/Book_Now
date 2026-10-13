import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'

let app
let practitioner
let service

/** Walks forward from tomorrow until the practitioner has an open day. */
async function findOpenDay() {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)

  for (let offset = 2; offset < 16; offset += 1) {
    const date = new Date(start.getTime() + offset * 86_400_000).toISOString().slice(0, 10)
    const res = await request(app)
      .get('/api/availability')
      .query({ practitioner: practitioner.id, service: service.id, date })

    const open = res.body.slots?.filter((s) => s.available) ?? []
    if (open.length > 2) return { date, slots: open }
  }

  throw new Error('No open day found in the next fortnight')
}

beforeAll(async () => {
  // Rebuild the fixtures so each run starts from the same calendar.
  const { seed } = await import('../../api/seed.js')
  seed()

  app = (await import('../../api/app.js')).default

  const people = await request(app).get('/api/practitioners')
  practitioner = people.body.find((p) => p.slug === 'ilse-vermeer')
  service = practitioner.services.find((s) => s.duration_minutes === 60)
})

describe('GET /api/practitioners', () => {
  it('lists everyone with their services and opening hours', async () => {
    const res = await request(app).get('/api/practitioners')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(4)
    expect(res.body[0].services.length).toBeGreaterThan(0)
    expect(res.body[0].hours.length).toBeGreaterThan(0)
  })
})

describe('GET /api/availability', () => {
  it('rejects a malformed date', async () => {
    const res = await request(app)
      .get('/api/availability')
      .query({ practitioner: practitioner.id, service: service.id, date: 'next tuesday' })
    expect(res.status).toBe(400)
  })

  it('reports the studio timezone alongside the slots', async () => {
    const { date } = await findOpenDay()
    const res = await request(app)
      .get('/api/availability')
      .query({ practitioner: practitioner.id, service: service.id, date })

    expect(res.body.timezone).toBe('Europe/Berlin')
    expect(res.body.window).toBeTruthy()
  })
})

describe('POST /api/bookings', () => {
  it('requires a name and a plausible email address', async () => {
    const { date, slots } = await findOpenDay()

    const noName = await request(app).post('/api/bookings').send({
      practitioner_id: practitioner.id,
      service_id: service.id,
      starts_at: slots[0].startsAt,
      ends_at: slots[0].endsAt,
      customer_email: 'someone@example.com',
    })
    expect(noName.status).toBe(400)

    const badEmail = await request(app).post('/api/bookings').send({
      practitioner_id: practitioner.id,
      service_id: service.id,
      starts_at: slots[0].startsAt,
      ends_at: slots[0].endsAt,
      customer_name: 'Test Person',
      customer_email: 'not-an-address',
    })
    expect(badEmail.status).toBe(400)
    expect(date).toBeTruthy()
  })

  it('takes a slot out of circulation once booked', async () => {
    const { date, slots } = await findOpenDay()
    const target = slots[1]

    const created = await request(app).post('/api/bookings').send({
      practitioner_id: practitioner.id,
      service_id: service.id,
      starts_at: target.startsAt,
      ends_at: target.endsAt,
      customer_name: 'Booked Person',
      customer_email: 'booked@example.com',
    })
    expect(created.status).toBe(201)

    const after = await request(app)
      .get('/api/availability')
      .query({ practitioner: practitioner.id, service: service.id, date })

    const slot = after.body.slots.find((s) => s.startsAt === target.startsAt)
    expect(slot.available).toBe(false)
  })

  it('releases the slot again when the appointment is cancelled', async () => {
    const { date, slots } = await findOpenDay()
    const target = slots[2]

    const created = await request(app).post('/api/bookings').send({
      practitioner_id: practitioner.id,
      service_id: service.id,
      starts_at: target.startsAt,
      ends_at: target.endsAt,
      customer_name: 'Cancelling Person',
      customer_email: 'cancelling@example.com',
    })
    expect(created.status).toBe(201)

    const cancelled = await request(app)
      .patch(`/api/bookings/${created.body.id}`)
      .send({ status: 'cancelled' })
    expect(cancelled.status).toBe(200)

    const after = await request(app)
      .get('/api/availability')
      .query({ practitioner: practitioner.id, service: service.id, date })

    const slot = after.body.slots.find((s) => s.startsAt === target.startsAt)
    expect(slot.available).toBe(true)
  })

  it('records the appointment length the service actually calls for', async () => {
    const { slots } = await findOpenDay()
    const target = slots[3]

    const created = await request(app).post('/api/bookings').send({
      practitioner_id: practitioner.id,
      service_id: service.id,
      starts_at: target.startsAt,
      // A stale client sends a length that does not match the service.
      ends_at: `${target.startsAt.split(' ')[0]} 23:45`,
      customer_name: 'Mismatched Person',
      customer_email: 'mismatch@example.com',
    })

    expect(created.status).toBe(201)
    expect(created.body.ends_at).toBe(target.endsAt)
  })
})
