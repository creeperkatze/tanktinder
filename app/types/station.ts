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

export interface StationsApiResponse {
  ok: boolean
  stations: Station[]
  averagePrice: number | null
  desperationLevel: number
}
