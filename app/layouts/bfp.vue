<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { user, logout } = useAuthSession()
const mobileNavOpen = ref(false)
const incidents = useState<Array<{ status: string }>>('fyrush-incidents', () => [])
const wsConnected = useState<boolean>('fyrush-ws-connected', () => false)
const wsPayload = useState<{ incidents?: Array<{ status: string }>, ts: number } | null>('fyrush-ws-payload', () => null)

const activeIncidentCount = computed(() => {
  const source = wsPayload.value?.incidents || incidents.value
  return source.filter(item => item.status !== 'completed' && item.status !== 'invalidated').length
})

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
  mobileNavOpen.value = false
  await logout()
  await navigateTo('/')
}

watch(() => route.path, () => {
  mobileNavOpen.value = false
})
</script>

<template>
  <div>
    <UHeader
      title="Fyrush"
      to="/bfp/dashboard"
      class="fixed inset-x-0 top-0 z-50 border-b border-default bg-default/95 text-default backdrop-blur"
      :toggle="false"
      :ui="{
        root: 'h-16',
        container: 'max-w-7xl mx-auto px-4 sm:px-6',
        left: 'gap-3',
        title: 'text-xl font-black tracking-tight'
      }"
    >
      <template #left>
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            class="md:hidden"
            aria-label="Open navigation"
            @click="mobileNavOpen = true"
          />
          <NuxtLink
            to="/bfp/dashboard"
            class="text-xl font-black text-(--fyrush-ink) dark:text-(--fyrush-paper)"
          >
            Fyrush
          </NuxtLink>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-2">
          <span
            class="hidden sm:inline-flex items-center gap-1 text-xs font-semibold"
            :class="wsConnected ? 'text-success' : 'text-muted'"
          >
            <span
              class="size-2 rounded-full"
              :class="wsConnected ? 'bg-success animate-pulse' : 'bg-neutral-400'"
            />
          </span>

          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-bell-ring"
            class="px-2 sm:px-3"
          >
            <span class="hidden sm:inline text-xs font-semibold">
              Alerts
            </span>
            <span class="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[11px] font-bold text-white">
              {{ activeIncidentCount }}
            </span>
          </UButton>
        </div>
      </template>
    </UHeader>

    <USlideover
      v-model:open="mobileNavOpen"
      side="left"
      title="Fyrush"
      class="md:hidden"
      :ui="{
        content: 'w-[86vw] max-w-xs',
        body: 'p-4'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <p class="font-black text-lg fyrush-title">
              BFP Control
            </p>
            <p class="text-xs text-muted mt-1">
              {{ user?.name }}
            </p>
          </div>

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

          <UButton
            color="neutral"
            variant="outline"
            block
            @click="signOut"
          >
            Logout
          </UButton>
        </div>
      </template>
    </USlideover>

    <UContainer class="max-w-7xl pt-20 pb-6">
      <div class="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside class="hidden md:block md:sticky md:top-20 md:self-start">
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
  </div>
</template>
