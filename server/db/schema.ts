import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  role: text('role').notNull(),
  loginId: text('login_id'),
  name: text('name').notNull(),
  email: text('email'),
  mobile: text('mobile'),
  address: text('address'),
  registeredLat: real('registered_lat'),
  registeredLng: real('registered_lng'),
  passwordHash: text('password_hash').notNull(),
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
