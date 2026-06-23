# Fyrush

A map-first fire alert and BFP (Bureau of Fire Protection) response system for **Barangay Kalipay**. Citizens report fire incidents via a 3-tap button; BFP personnel validate, dispatch responders, and track incidents in real time on an interactive map — all as a progressive web app.

## How It Was Built

### Stack

| Layer | Technology |
|---|---|
| **Meta-framework** | Nuxt 4 (Vue 3 + Nitro server engine) |
| **UI** | Nuxt UI v4 (Reka UI / Radix Vue primitives, Tailwind CSS v4) |
| **Language** | TypeScript |
| **Package manager** | pnpm |
| **Database ORM** | Drizzle ORM |
| **Database** | libSQL (dev) / Cloudflare D1 (production) |
| **Database provider** | NuxtHub |
| **Auth** | nuxt-auth-utils (session-based, encrypted cookies, Google OAuth 2.0) |
| **Maps** | Leaflet via @nuxtjs/leaflet (OpenStreetMap tiles) |
| **Real-time** | Nitro WebSocket (2-second broadcast of incidents + responder locations) |
| **Push notifications** | Web Push API with VAPID (JWT-signed via jose) |
| **PWA** | @vite-pwa/nuxt (inject-manifest, Workbox precaching, auto-update) |
| **Hosting** | Cloudflare Workers (Nitro preset: cloudflare-durable) |
| **CI/CD** | GitHub Actions (lint + typecheck → D1 migrations → deploy) |
| **Linting** | ESLint v10 via @nuxt/eslint |

### Architecture

The system follows a **server-centric, session-authenticated** architecture where the Nitro backend is the single source of truth for incidents, user data, and real-time state.

**Authentication flow:**
1. Google OAuth login → server creates/updates user, assigns role (citizen / bfp / point_person)
2. Encrypted session cookie (7-day max age) persists auth state
3. Global middleware routes by role: `/bfp/dashboard` (BFP) or `/citizen/report` (citizen)

**Incident lifecycle:**

```
NEW → VALIDATED → ON_THE_WAY → COMPLETED
  ↘ INVALIDATED (at any point)
```

- Citizens trigger a 3-tap report button that sends their registered location or a manual map pin
- Point persons' reports auto-validate; BFP manually validates or invalidates
- New reports within **30 meters** (Haversine) of an active incident are merged (incrementing report_count)
- BFP dispatches responders, sharing live geolocation via `watchPosition` → WebSocket broadcast
- Push notifications fire on every status change (server-side VAPID‑signed via jose)

**Real-time:**
- WebSocket at `/ws/incidents` broadcasts the full incident feed + responder locations every 2 seconds
- Both BFP and citizen pages subscribe and update reactively
- Service worker handles background push when the app is closed

### Database

Six SQLite tables managed via Drizzle ORM and NuxtHub:

- `users` — roles, Google identity, profile, registered location
- `incidents` — lat/lng, status, report count, timestamps for each lifecycle step
- `incident_reports` — each report submission (source: registered/manual)
- `point_person_assignments` — incident–BFP assignments
- `responder_locations` — real-time BFP geolocation (upsert)
- `push_subscriptions` — Web Push endpoints per user

Migrations are auto-generated with `npx nuxt db generate` and applied via `npx nuxt db migrate`.

### PWA

The service worker (`app/public/sw.ts`) uses Workbox precaching and handles push events by fetching the notification summary endpoint, comparing incident signatures, and showing notifications with vibration patterns. Clicking a notification navigates to the report page.

Install prompts and auto-update are configured via `@vite-pwa/nuxt` with inject-manifest strategy.

### Deployment

Two GitHub Actions workflows:

1. **CI** (`.github/workflows/ci.yml`) — lint + typecheck on PRs and master pushes
2. **Deploy** (`.github/workflows/deploy.yml`) — build → apply D1 migrations → deploy to Cloudflare Workers

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Wrangler config (`wrangler.jsonc`) binds the D1 database, KV namespace, and Durable Object.

## Development

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
pnpm preview    # preview production build
```

## Environment Variables

See `.env` for the full list: Google OAuth credentials, session password (32+ chars), VAPID keys for Web Push, BFP email list, and NuxtHub DB controls.
