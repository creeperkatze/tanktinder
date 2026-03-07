import { capture } from '../utils/posthog'

export interface Station {
  id: string
  name: string
  brand: string
  street: string
  houseNumber: string
  postCode: number
  place: string
  lat: number
  lng: number
  dist: number
  e5: number | false
  e10: number | false
  diesel: number | false
  isOpen: boolean
}

let blockedUntil: number | null = null;

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)
  const apiKey = config.tankerkoenigApiKey

  if (!apiKey) {
    throw createError({ statusCode: 503, message: 'No API key configured' })
  }

  if (blockedUntil !== null && Date.now() < blockedUntil) {
    const retryAfter = Math.ceil((blockedUntil - Date.now()) / 1000)
    throw createError({
      statusCode: 429,
      message: `Rate limited, retry in ${retryAfter}s`,
      data: { retryAfter }, 
    })
  }

  const lat = String(query.lat)
  const lng = String(query.lng)
  const rad = String(query.rad ?? '20')

  const url = new URL('https://creativecommons.tankerkoenig.de/json/list.php')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lng', lng)
  url.searchParams.set('rad', rad)
  url.searchParams.set('type', 'all')
  url.searchParams.set('sort', 'dist')
  url.searchParams.set('apikey', apiKey)

  let data: { ok: boolean; stations: Station[]; message?: string }
  try {
    data = await $fetch<{
      ok: boolean
      stations: Station[]
      message?: string
    }>(url.toString(), { timeout: 15_000, retry: 0 })
  } catch (err: any) {
    const status = err?.response?.status ?? err?.statusCode ?? 502
    if (status === 503) {
      blockedUntil = Date.now() + 60_000
      throw createError({
        statusCode: 429,
        message: 'Tankerkönig API returned rate limit request',
        data: { retryAfter: 60 },
      })
    }
    throw createError({ statusCode: 502, message: `Tankerkönig API error (${status})` })
  }

  if (!data.ok) {
    throw createError({ statusCode: 502, message: data.message ?? 'Tankerkönig API error' })
  }

  const stations = data.stations ?? []

  const ip = String(getRequestIP(event, { xForwardedFor: true }) ?? 'server')
  capture('stations_fetched', { $ip: ip, lat, lng, rad, station_count: stations.length }, ip)

  const arranged = arrangeStations(stations)
  const averagePrice = computeAveragePrice(stations)
  const desperationLevel = computeDesperationLevel(averagePrice)
  return { ok: true, stations: arranged, averagePrice, desperationLevel }
})

function getPrice(s: Station): number {
  if (typeof s.e5 === 'number' && s.e5 > 0) return s.e5
  if (typeof s.e10 === 'number' && s.e10 > 0) return s.e10
  if (typeof s.diesel === 'number' && s.diesel > 0) return s.diesel
  return Infinity
}

function arrangeStations(list: Station[]): Station[] {
  if (list.length <= 2) return [...list].sort((a, b) => getPrice(a) - getPrice(b))

  const sorted = [...list].sort((a, b) => getPrice(a) - getPrice(b))
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.28))
  const top = sorted.slice(0, topCount)
  const rest = sorted.slice(topCount).reverse()

  const n = sorted.length
  const topSlots = new Set<number>()
  topSlots.add(Math.min(3, n - 1))

  const extra = top.length - 1
  if (extra > 0) {
    const lo = Math.min(5, n - 1)
    const hi = Math.min(9, n - 1)
    for (let i = 0; i < extra; i++) {
      let idx = extra === 1 ? lo : Math.round(lo + (i / (extra - 1)) * (hi - lo))
      idx = Math.min(idx, n - 1)
      while (topSlots.has(idx) && idx < n - 1) idx++
      topSlots.add(idx)
    }
  }

  const sortedSlots = [...topSlots].sort((a, b) => a - b)
  const result: Station[] = []
  let ti = 0, ri = 0

  for (let i = 0; i < n; i++) {
    if (sortedSlots[ti] === i) {
      result.push(top[ti++]!)
    } else {
      result.push(rest[ri++]!)
    }
  }

  return result
}

function computeAveragePrice(stations: Station[]): number | null {
  const prices = stations
    .map(s => { const v = getPrice(s); return v < Infinity ? v : null })
    .filter((p): p is number => p !== null)
  if (!prices.length) return null
  return prices.reduce((a, b) => a + b, 0) / prices.length
}

function computeDesperationLevel(avg: number | null): number {
  if (avg === null) return 0
  return Math.min(100, Math.max(0, ((avg - 1.4) / (2.2 - 1.4)) * 100))
}

