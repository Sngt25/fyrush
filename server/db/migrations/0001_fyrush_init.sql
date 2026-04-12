CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  login_id TEXT,
  name TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  registered_lat REAL,
  registered_lng REAL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  report_count INTEGER NOT NULL DEFAULT 1,
  created_by_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  timer_started_at INTEGER,
  dispatched_at INTEGER,
  closed_at INTEGER
);

CREATE TABLE IF NOT EXISTS incident_reports (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS point_person_assignments (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  assigned_by_user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS responder_locations (
  incident_id TEXT PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  updated_at INTEGER NOT NULL
);
