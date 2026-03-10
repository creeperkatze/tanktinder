import { capture } from '../utils/posthog'
import { TankerkoenigClient, TankerkoenigError } from 'tankerkoenig-js'
import type { Station } from '../../app/types/station'

let client: TankerkoenigClient | null = null

function getClient(): TankerkoenigClient {
  if (!client) {
    const apiKey = useRuntimeConfig().tankerkoenigApiKey
    if (!apiKey) throw createError({ statusCode: 503, message: 'No API key configured' })
    client = new TankerkoenigClient(apiKey)
  }
  return client
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const lat = Number(query.lat)
  const lng = Number(query.lng)
  const rad = Number(query.rad ?? 20)

  const client = getClient()

  let stations: Station[]
  try {
    stations = await client.list({ lat, lng, rad, type: 'all', sort: 'dist' }) as Station[]
  } catch (err) {
    if (err instanceof TankerkoenigError) {
      throw createError({ statusCode: 502, message: err.message })
    }
    throw createError({ statusCode: 502, message: 'Tankerkönig API error' })
  }

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
  if (list.length <= 3) return list

  // Keep natural distance order, but ensure cheapest is within first 10 and not at 0 or 1
  const result = [...list]
  const bestIdx = result.reduce((bi, s, i) => getPrice(s) < getPrice(result[bi]!) ? i : bi, 0)
  const targetIdx = Math.min(2 + Math.floor(Math.random() * 3), result.length - 1)

  if (bestIdx <= 1 || bestIdx > 4) {
    const [best] = result.splice(bestIdx, 1)
    result.splice(targetIdx, 0, best!)
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

