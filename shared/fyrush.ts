export const BARANGAY_KALIPAY_CENTER = {
  lat: 12.3717467,
  lng: 123.622003
  // lat: 13.14790,
  // lng: 123.72041
} as const

export const INCIDENT_STATUS = {
  NEW: 'new',
  VALIDATED: 'validated',
  INVALIDATED: 'invalidated',
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
  address: string | null
  authProvider: 'google' | 'legacy'
  profileComplete: boolean
  registeredLat: number | null
  registeredLng: number | null
  idPhotoPathname: string | null
}

export interface ReporterInfo {
  userId: string
  userName: string
  userMobile: string | null
  userRole: string
  userPhotoPathname: string | null
}

export interface IncidentFeedItem {
  id: string
  latitude: number
  longitude: number
  address: string
  description: string | null
  status: IncidentStatus
  reportCount: number
  createdByUserId: string
  createdAt: number
  updatedAt: number
  validatedAt: number | null
  invalidatedAt: number | null
  timerStartedAt: number | null
  dispatchedAt: number | null
  closedAt: number | null
}
