// https://nuxt.com/docs/api/configuration/nuxt-config
const useLocalHubDb = process.env.NODE_ENV !== 'production' && process.env.NUXT_HUB_USE_LOCAL_DB !== 'false'

export default defineNuxtConfig({

  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image', '@nuxthub/core', '@vite-pwa/nuxt', '@nuxtjs/leaflet', 'nuxt-auth-utils'],
  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
      cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
        domain: process.env.NUXT_SESSION_COOKIE_DOMAIN || undefined
      }
    },
    bfpEmail: process.env.BFP_EMAIL,
    oauth: {
      google: {
        clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID || process.env.NUXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID || process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET
      }
    },
    webPushPrivateKey: process.env.NUXT_WEB_PUSH_PRIVATE_KEY || '',
    webPushSubject: process.env.NUXT_WEB_PUSH_SUBJECT || '',
    public: {
      webPushPublicKey: process.env.NUXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || '',
      barangayCenter: [123.622003, 12.3717467]
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    preset: 'cloudflare-durable',
    experimental: {
      websocket: true
    }
  },

  hub: {
    db: {
      dialect: 'sqlite',
      driver: useLocalHubDb ? 'libsql' : 'd1',
      ...(useLocalHubDb
        ? {
            connection: {
              url: process.env.NUXT_HUB_LOCAL_DB_URL || 'file:.data/db/sqlite.db'
            }
          }
        : {}),
      applyMigrationsDuringBuild: false
    },
    kv: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    strategies: 'injectManifest',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    client: {
      installPrompt: true
    },
    manifest: {
      name: 'Fyrush',
      short_name: 'Fyrush',
      description: 'Fyrush is a BFP alert system with installable Nuxt PWA features, including notifications, biometrics, geolocation, and vibration.',
      theme_color: '#0f172a',
      background_color: '#0b1120',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/icons/apple-touch-icon.png',
          sizes: '180x180',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      navigateFallbackDenylist: [/^\//],
      globPatterns: ['**/*.{js,css,html,json,ico,png,svg,webp}']
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})
