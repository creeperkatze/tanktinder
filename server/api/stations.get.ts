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

const MOCK_STATIONS: Station[] = [
  {
    id: 'mock-1',
    name: 'Teuro-Palace GmbH & Schmerz KG',
    brand: 'TEURO',
    street: 'Geldverbrennungsallee',
    houseNumber: '1',
    postCode: 10115,
    place: 'Schmerzstadt',
    lat: 52.52,
    lng: 13.405,
    dist: 0.3,
    e5: 1.999,
    e10: 1.979,
    diesel: 1.879,
    isOpen: true,
  },
  {
    id: 'mock-2',
    name: 'Arabische Nächte Benzin AG',
    brand: 'ÖLSCHEICH',
    street: 'Petrodollarweg',
    houseNumber: '42',
    postCode: 10117,
    place: 'Rentnerschreck',
    lat: 52.523,
    lng: 13.41,
    dist: 0.8,
    e5: 2.139,
    e10: 2.119,
    diesel: 1.959,
    isOpen: true,
  },
  {
    id: 'mock-3',
    name: 'Nierenverkauf Optional GmbH',
    brand: 'LUXOEL',
    street: 'Yachthafen Promenade',
    houseNumber: '7',
    postCode: 10119,
    place: 'Millionärsdorf',
    lat: 52.519,
    lng: 13.395,
    dist: 1.4,
    e5: 2.299,
    e10: 2.279,
    diesel: 2.079,
    isOpen: false,
  },
  {
    id: 'mock-4',
    name: 'Schmerzensgeld Autohof',
    brand: 'WEHKLAG',
    street: 'Insolvenzstraße',
    houseNumber: '99',
    postCode: 10243,
    place: 'Überschuldung',
    lat: 52.513,
    lng: 13.44,
    dist: 2.1,
    e5: 1.839,
    e10: 1.819,
    diesel: 1.749,
    isOpen: true,
  },
  {
    id: 'mock-5',
    name: 'Matrix Glitch Tankstelle',
    brand: 'CHEAPOIL',
    street: 'Unglaublichegasse',
    houseNumber: '0',
    postCode: 10785,
    place: 'Utopiafeld',
    lat: 52.508,
    lng: 13.364,
    dist: 3.7,
    e5: 1.659,
    e10: 1.639,
    diesel: 1.579,
    isOpen: true,
  },
  {
    id: 'mock-6',
    name: 'Dein letztes Hemd Tankstop',
    brand: 'ARMUT',
    street: 'Pfandflaschenring',
    houseNumber: '13',
    postCode: 10963,
    place: 'Sparzwang',
    lat: 52.498,
    lng: 13.38,
    dist: 4.2,
    e5: 1.779,
    e10: 1.759,
    diesel: 1.689,
    isOpen: true,
  },
]

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const config = useRuntimeConfig(event)
  const apiKey = config.tankerkoenigApiKey

  if (!apiKey) {
    console.warn('[stations] No TANKERKOENIG_API_KEY set – returning mock data.')
    return { ok: true, isMock: true, stations: MOCK_STATIONS }
  }

  const lat = String(query.lat ?? '52.5200')
  const lng = String(query.lng ?? '13.4050')
  const rad = String(query.rad ?? '20')

  const url = new URL('https://creativecommons.tankerkoenig.de/json/list.php')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lng', lng)
  url.searchParams.set('rad', rad)
  url.searchParams.set('type', 'all')
  url.searchParams.set('sort', 'dist')
  url.searchParams.set('apikey', apiKey)

  try {
    const data = await $fetch<{
      ok: boolean
      stations: Station[]
      message?: string
    }>(url.toString(), { timeout: 15_000 })

    if (!data.ok) {
      console.warn(`[stations] Tankerkönig error: ${data.message}`)
      return { ok: true, isMock: true, stations: MOCK_STATIONS }
    }

    return { ok: true, isMock: false, stations: data.stations ?? [] }
  }
  catch (err: unknown) {
    if (err !== null && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    console.warn('[stations] Network error reaching Tankerkönig API', err)
    return { ok: true, isMock: true, stations: MOCK_STATIONS }
  }
})
