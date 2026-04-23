# Nuxt Starter Template

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Use this template to get started with [Nuxt UI](https://ui.nuxt.com) quickly.

- [Live demo](https://starter-template.nuxt.dev/)
- [Documentation](https://ui.nuxt.com/docs/getting-started/installation/nuxt)

<a href="https://starter-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/starter-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/starter-light.png">
    <img alt="Nuxt Starter Template" src="https://ui.nuxt.com/assets/templates/nuxt/starter-light.png" width="830" height="466">
  </picture>
</a>

> The starter template for Vue is on https://github.com/nuxt-ui-templates/starter-vue.

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t ui
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=starter&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fstarter&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fstarter-dark.png&demo-url=https%3A%2F%2Fstarter-template.nuxt.dev%2F&demo-title=Nuxt%20Starter%20Template&demo-description=A%20minimal%20template%20to%20get%20started%20with%20Nuxt%20UI.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

Set these environment variables before running the app:

```bash
NUXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
# Backward-compatible fallback also supported:
# NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret
BFP_EMAIL=firestation@example.com

# Required for encrypted auth sessions (minimum 32 chars).
# Example: openssl rand -hex 32
NUXT_SESSION_PASSWORD=replace-with-a-long-random-secret

# Optional: set this if you authenticate on one subdomain and serve app on another.
# Example: .example.com
# NUXT_SESSION_COOKIE_DOMAIN=

# Web Push (required for background notifications while app/browser is closed)
# Public key is exposed to the client app.
NUXT_PUBLIC_WEB_PUSH_PUBLIC_KEY=your-base64url-vapid-public-key
# Private key must stay server-side only.
NUXT_WEB_PUSH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
# Subject should be a contact URL or mailto.
NUXT_WEB_PUSH_SUBJECT=mailto:alerts@fyrush.app

# Development DB switch for NuxtHub:
# true (default) -> uses .data/db/sqlite.db while running nuxt dev
# false -> disables local DB override in development
NUXT_HUB_USE_LOCAL_DB=true

# Optional local DB override:
# NUXT_HUB_LOCAL_DB_URL=file:.data/db/sqlite.db
```

Generate VAPID keys (example with web-push CLI):

```bash
pnpm dlx web-push generate-vapid-keys
```

Use the generated public key as `NUXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` and the generated private key as `NUXT_WEB_PUSH_PRIVATE_KEY`.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Apply production D1 migrations and deploy:

```bash
# run this after `pnpm build`
pnpm run db:migrate:remote
pnpm exec wrangler deploy
```

The migration command uses `wrangler.jsonc` (with `migrations_table: "_hub_migrations"`) so CI can resolve migration files reliably.

## CI/CD (GitHub Actions)

This repository now uses two workflows:

- `.github/workflows/ci.yml`: lint + typecheck on pull requests and `master` pushes
- `.github/workflows/deploy.yml`: build, apply D1 migrations, and deploy on `master` pushes

Set these repository secrets for deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
