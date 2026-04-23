import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  role: text('role').notNull(),
  loginId: text('login_id'),
  name: text('name').notNull(),
  email: text('email'),
  googleId: text('google_id'),
  authProvider: text('auth_provider').notNull().default('legacy'),
  mobile: text('mobile'),
  address: text('address'),
  profileComplete: integer('profile_complete').notNull().default(0),
  profileCompletedAt: integer('profile_completed_at'),
  registeredLat: real('registered_lat'),
  registeredLng: real('registered_lng'),
  createdAt: integer('created_at').notNull()
})

export const incidents = sqliteTable('incidents', {
  id: text('id').primaryKey(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  address: text('address').notNull(),
  status: text('status').notNull(),
  reportCount: integer('report_count').notNull().default(1),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  validatedAt: integer('validated_at'),
  invalidatedAt: integer('invalidated_at'),
  timerStartedAt: integer('timer_started_at'),
  dispatchedAt: integer('dispatched_at'),
  closedAt: integer('closed_at')
})

export const incidentReports = sqliteTable('incident_reports', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').notNull(),
  userId: text('user_id').notNull(),
  source: text('source').notNull(),
  createdAt: integer('created_at').notNull()
})

export const pointPersonAssignments = sqliteTable('point_person_assignments', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id').notNull(),
  userId: text('user_id').notNull(),
  assignedByUserId: text('assigned_by_user_id').notNull(),
  createdAt: integer('created_at').notNull()
})

export const responderLocations = sqliteTable('responder_locations', {
  incidentId: text('incident_id').primaryKey(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  endpoint: text('endpoint').primaryKey(),
  userId: text('user_id').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull()
})
