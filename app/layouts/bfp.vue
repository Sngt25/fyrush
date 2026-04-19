<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { user, logout } = useAuthSession()

const navItems = computed<NavigationMenuItem[][]>(() => [[
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/bfp/dashboard',
    active: route.path === '/bfp/dashboard'
  },
  {
    label: 'Logs',
    icon: 'i-lucide-clipboard-list',
    to: '/bfp/logs',
    active: route.path === '/bfp/logs'
  },
  {
    label: 'Point Persons',
    icon: 'i-lucide-users',
    to: '/bfp/point-persons',
    active: route.path === '/bfp/point-persons'
  }
]])

async function signOut() {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <UContainer class="py-6 max-w-7xl">
    <div class="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="md:sticky md:top-4 md:self-start">
        <UCard class="fyrush-panel">
          <template #header>
            <p class="font-black text-lg fyrush-title">
              BFP Control
            </p>
            <p class="text-xs text-muted mt-1">
              {{ user?.name }}
            </p>
          </template>

          <UNavigationMenu
            orientation="vertical"
            highlight
            color="error"
            class="data-[orientation=vertical]:w-full"
            :items="navItems"
            :ui="{
              list: 'space-y-1',
              link: 'rounded-xl',
              linkLabel: 'font-semibold'
            }"
          />

          <template #footer>
            <UButton
              color="neutral"
              variant="outline"
              block
              @click="signOut"
            >
              Logout
            </UButton>
          </template>
        </UCard>
      </aside>

      <section class="space-y-4 min-w-0">
        <slot />
      </section>
    </div>
  </UContainer>
</template>
