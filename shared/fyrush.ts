export const BARANGAY_KALIPAY_CENTER = {
  lat: 12.3717467,
  lng: 123.622003
} as const

export const INCIDENT_STATUS = {
  NEW: 'new',
  VALIDATED: 'validated',
  ON_THE_WAY: 'on_the_way',
  COMPLETED: 'completed'
} as const

export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS]

export const USER_ROLE = {
  CITIZEN: 'citizen',
  BFP: 'bfp',
  POINT_PERSON: 'point_person'
} as const

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export interface AuthUser {
  id: string
  role: UserRole
  name: string
  email: string | null
  mobile: string | null
  registeredLat: number | null
  registeredLng: number | null
}

export interface IncidentFeedItem {
  id: string
  latitude: number
  longitude: number
  address: string
  status: IncidentStatus
  reportCount: number
  createdByUserId: string
  createdAt: number
  updatedAt: number
  timerStartedAt: number | null
  dispatchedAt: number | null
  closedAt: number | null
}
