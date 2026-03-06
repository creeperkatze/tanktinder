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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)
  const apiKey = config.tankerkoenigApiKey

  if (!apiKey) {
    throw createError({ statusCode: 503, message: 'No API key configured' })
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

  const data = await $fetch<{
    ok: boolean
    stations: Station[]
    message?: string
  }>(url.toString(), { timeout: 15_000 })

  if (!data.ok) {
    throw createError({ statusCode: 502, message: data.message ?? 'Tankerkönig API Error' })
  }

  return { ok: true, stations: data.stations ?? [] }
})
