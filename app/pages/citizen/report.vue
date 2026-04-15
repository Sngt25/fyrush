<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { BARANGAY_KALIPAY_CENTER } from '#shared/fyrush'

const route = useRoute()
const { refreshUser, logout } = useAuthSession()
const { incidents, history, fetchIncidents, fetchHistory, reportIncident } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()

const locationPromptOpen = ref(false)
const submitConfirmOpen = ref(false)
const useSetLocation = ref(true)
const mapVisible = ref(false)
const pending = ref(false)
const manualMarker = ref<[number, number]>([BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const statusMessage = ref('Checking your session...')

const setLocationPoint = computed<[number, number]>(() => [BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])

const locationLabel = computed(() =>
  useSetLocation.value ? 'Location: Barangay Kalipay' : 'Location: Manual map pin'
)

const locationDetail = computed(() =>
  useSetLocation.value
    ? 'Set location active'
    : `Pinned at ${manualMarker.value[1].toFixed(5)}, ${manualMarker.value[0].toFixed(5)}`
)

const latestIncident = computed(() => incidents.value[0] || null)

const bottomNavItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/'
  },
  {
    label: 'Report',
    icon: 'i-lucide-flame',
    to: '/citizen/report',
    active: route.path === '/citizen/report'
  },
  {
    label: 'Profile',
    icon: 'i-lucide-user-round',
    to: '/citizen/auth'
  }
])

onMounted(async () => {
  const current = await refreshUser()
  if (!current || current.role === 'bfp') {
    await navigateTo('/citizen/auth')
    return
  }

  await Promise.all([fetchIncidents(), fetchHistory()])
  connect()

  locationPromptOpen.value = true
  statusMessage.value = 'Confirm where the fire is before sending your alert.'
})

onBeforeUnmount(() => disconnect())

watch(payload, (value) => {
  if (value?.incidents)
    incidents.value = value.incidents as typeof incidents.value
})

function confirmSetLocation() {
  useSetLocation.value = true
  mapVisible.value = false
  locationPromptOpen.value = false
  statusMessage.value = 'Set location confirmed. Tap REPORT FIRE to send an alert.'
}

function chooseManualLocation() {
  useSetLocation.value = false
  mapVisible.value = true
  locationPromptOpen.value = false
  statusMessage.value = 'Tap on the map to pin the exact fire location, then report.'
}

function toggleMap() {
  mapVisible.value = !mapVisible.value
}

async function submitReport() {
  pending.value = true

  try {
    if (useSetLocation.value) {
      await reportIncident({ useRegistered: true })
    } else {
      await reportIncident({
        useRegistered: false,
        longitude: manualMarker.value[0],
        latitude: manualMarker.value[1],
        address: 'Manually pinned location'
      })
    }

    statusMessage.value = 'Fire report submitted successfully.'
    submitConfirmOpen.value = false
    await fetchHistory()
  } catch (err) {
    statusMessage.value = err instanceof Error ? err.message : 'Report submission failed.'
  } finally {
    pending.value = false
  }
}

async function signOut() {
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <UContainer class="py-5 max-w-md">
    <div class="fyrush-phone-frame rounded-[1.7rem] border border-black/15 bg-white shadow-2xl overflow-hidden">
      <header class="bg-(--fyrush-ink) text-white px-4 py-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-4xl leading-none font-black tracking-tight">
              Fyrush
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            class="text-white"
            icon="i-lucide-circle-user-round"
            @click="signOut"
          />
        </div>
      </header>

      <main class="p-4 space-y-4 pb-24">
        <div class="fyrush-location-card rounded-2xl px-4 py-3">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-map-pin"
              class="size-6 mt-0.5 text-(--fyrush-ink)"
            />
            <div>
              <p class="font-extrabold text-lg leading-tight text-(--fyrush-ink)">
                {{ locationLabel }}
              </p>
              <p class="text-sm text-(--fyrush-ink)/85">
                ({{ locationDetail }})
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-center pt-2">
          <button
            class="fyrush-report-ring"
            type="button"
            :disabled="pending"
            @click="submitConfirmOpen = true"
          >
            <span class="fyrush-report-core">
              <UIcon
                name="i-lucide-flame"
                class="size-14 text-white"
              />
              <span class="text-4xl font-black tracking-tight leading-none">REPORT</span>
              <span class="text-4xl font-black tracking-tight leading-none">FIRE</span>
            </span>
          </button>
        </div>

        <p class="text-center text-sm text-muted">
          Tap to Send Alert
        </p>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-2xl font-black fyrush-title">
              History Log
            </h2>
            <div class="flex gap-2">
              <UButton
                color="neutral"
                variant="soft"
                size="sm"
                icon="i-lucide-map"
                @click="locationPromptOpen = true"
              >
                Location
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-map-pinned"
                @click="toggleMap"
              >
                {{ mapVisible ? 'Hide Map' : 'Show Map' }}
              </UButton>
            </div>
          </div>

          <UCard
            v-if="latestIncident"
            class="bg-(--fyrush-ink) text-white border-none"
          >
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-history"
                class="size-6 mt-0.5"
              />
              <div>
                <p class="font-bold">
                  {{ latestIncident.status }}
                </p>
                <p class="text-sm text-white/85">
                  {{ latestIncident.address }}
                </p>
              </div>
            </div>
          </UCard>

          <UCard v-else>
            <p class="text-sm text-muted">
              No incident history yet.
            </p>
          </UCard>

          <UCard v-if="history.length > 0">
            <ul class="space-y-2 text-sm">
              <li
                v-for="item in history"
                :key="item.id"
                class="border-b border-default pb-2 last:border-b-0"
              >
                <p class="font-semibold capitalize">
                  {{ item.status }}
                </p>
                <p class="text-muted">
                  {{ item.address }}
                </p>
              </li>
            </ul>
          </UCard>

          <Transition name="fade-slide">
            <CitizenReportMap
              v-if="mapVisible"
              v-model:manual-marker="manualMarker"
              :user-has-registered-point="true"
              :registered-point="setLocationPoint"
            />
          </Transition>

          <UAlert
            :title="statusMessage"
            color="info"
            variant="soft"
          />
        </div>
      </main>

      <footer class="absolute bottom-0 left-0 right-0 border-t border-default bg-white/95 backdrop-blur px-3 py-2">
        <UNavigationMenu
          :items="bottomNavItems"
          class="w-full justify-around"
          :ui="{
            list: 'w-full justify-around',
            link: 'flex-1 justify-center rounded-full px-3 py-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700',
            linkLabel: 'text-xs font-semibold'
          }"
        />
      </footer>
    </div>

    <UModal
      v-model:open="locationPromptOpen"
      title="Is the fire in the set location?"
      :ui="{ body: 'space-y-3' }"
    >
      <template #body>
        <p class="text-sm text-muted">
          Set location: Barangay Kalipay. Choose Yes to report quickly, or No to pin the exact map point.
        </p>
      </template>

      <template #footer>
        <div class="w-full flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            block
            @click="chooseManualLocation"
          >
            No, choose on map
          </UButton>
          <UButton
            color="error"
            block
            @click="confirmSetLocation"
          >
            Yes, use set location
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="submitConfirmOpen"
      title="Send fire report now?"
    >
      <template #body>
        <p class="text-sm text-muted">
          This will alert responders immediately for {{ useSetLocation ? 'Barangay Kalipay set location' : 'your pinned map location' }}.
        </p>
      </template>

      <template #footer>
        <div class="w-full flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            block
            @click="submitConfirmOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            block
            :loading="pending"
            @click="submitReport"
          >
            Confirm and Submit
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
