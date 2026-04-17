// https://nuxt.com/docs/api/configuration/nuxt-config
const resolvedGoogleClientId = process.env.NUXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID || process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export default defineNuxtConfig({

  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/image', '@nuxthub/core', '@vite-pwa/nuxt', '@nuxtjs/leaflet', 'nuxt-google-auth'],
  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    bfpEmail: process.env.BFP_EMAIL,
    public: {
      googleClientId: resolvedGoogleClientId,
      googleAuth: {
        clientId: resolvedGoogleClientId,
        promptOneTap: false
      },
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
    db: 'sqlite',
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

  googleAuth: {
    clientId: resolvedGoogleClientId,
    autoLoadScript: true,
    promptOneTap: false,
    enableServerVerify: true
  },

  pwa: {
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
