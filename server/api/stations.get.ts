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

  const ip = String(getRequestIP(event) ?? 'server')
  capture('stations_fetched', { $ip: ip, lat, lng, rad, station_count: stations.length }, ip)

  return { ok: true, stations }
})
