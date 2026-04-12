<script setup>
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#0f172a' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Nuxt Starter Template'
const description = 'Fyrush is a map-first fire alert and BFP response system for Barangay Kalipay.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/icons/icon-512.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <NuxtPwaManifest />

  <UApp>
    <UMain class="min-h-screen fyrush-bg">
      <NuxtPage />
    </UMain>
  </UApp>
</template>
