<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { BARANGAY_KALIPAY_CENTER } from '#shared/fyrush'

const route = useRoute()
const { refreshUser, logout } = useAuthSession()
const { incidents, history, fetchIncidents, fetchHistory, reportIncident } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()

const locationPromptOpen = ref(false)
const submitConfirmOpen = ref(false)
const mapDialogOpen = ref(false)
const useSetLocation = ref(true)
const pending = ref(false)
const manualMarker = ref<[number, number]>([BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const statusMessage = ref('Checking your session...')

const setLocationPoint = computed<[number, number]>(() => [BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const latestIncident = computed(() => incidents.value[0] || null)

const locationLabel = computed(() =>
  useSetLocation.value ? 'Location: Barangay Kalipay' : 'Location: Manual map pin'
)

const locationDetail = computed(() =>
  useSetLocation.value
    ? 'Set location active'
    : `Pinned at ${manualMarker.value[1].toFixed(5)}, ${manualMarker.value[0].toFixed(5)}`
)

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
  locationPromptOpen.value = false
  mapDialogOpen.value = false
  statusMessage.value = 'Set location confirmed. Tap REPORT FIRE to send an alert.'
}

function chooseManualLocation() {
  useSetLocation.value = false
  locationPromptOpen.value = false
  mapDialogOpen.value = true
  statusMessage.value = 'Tap on the map to pin the exact fire location, then report.'
}

function openMapDialog() {
  useSetLocation.value = false
  mapDialogOpen.value = true
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
  <div class="h-dvh w-full md:max-w-6xl mx-auto">
    <div class="md:hidden h-dvh w-full overflow-hidden bg-white flex flex-col">
      <CitizenReportMobileHeader @sign-out="signOut" />

      <CitizenReportMobileMain
        :location-label="locationLabel"
        :location-detail="locationDetail"
        :pending="pending"
        :latest-incident="latestIncident"
        :history="history"
        :status-message="statusMessage"
        @open-submit="submitConfirmOpen = true"
        @open-location-prompt="locationPromptOpen = true"
        @open-map="openMapDialog"
      />

      <footer class="sticky bottom-0 z-20 border-t border-default bg-white/95 backdrop-blur px-3 py-2">
        <CitizenReportBottomNav :items="bottomNavItems" />
      </footer>
    </div>

    <div class="hidden md:flex h-dvh w-full overflow-hidden border border-default bg-white shadow-2xl flex-col">
      <CitizenReportDesktopHeader
        @open-location-prompt="locationPromptOpen = true"
        @sign-out="signOut"
      />

      <CitizenReportDesktopMain
        :location-label="locationLabel"
        :location-detail="locationDetail"
        :pending="pending"
        :latest-incident="latestIncident"
        :history="history"
        :status-message="statusMessage"
        @open-submit="submitConfirmOpen = true"
        @open-map="openMapDialog"
      />

      <footer class="sticky bottom-0 z-20 border-t border-default bg-white/95 backdrop-blur px-3 py-2">
        <CitizenReportBottomNav
          :items="bottomNavItems"
          desktop
        />
      </footer>
    </div>

    <CitizenReportDialogs
      v-model:location-prompt-open="locationPromptOpen"
      v-model:map-dialog-open="mapDialogOpen"
      v-model:submit-confirm-open="submitConfirmOpen"
      v-model:manual-marker="manualMarker"
      :use-set-location="useSetLocation"
      :pending="pending"
      :set-location-point="setLocationPoint"
      @choose-manual-location="chooseManualLocation"
      @confirm-set-location="confirmSetLocation"
      @submit-report="submitReport"
    />
  </div>
</template>
