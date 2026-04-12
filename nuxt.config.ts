// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxthub/core',
    'nuxt-maplibre',
    '@vite-pwa/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      mapStyleUrl: 'https://demotiles.maplibre.org/style.json',
      barangayCenter: [123.622003, 12.3717467]
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  nitro: {
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
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,json,ico,png,svg,webp}']
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})
