<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { BARANGAY_KALIPAY_CENTER, INCIDENT_STATUS, type IncidentFeedItem } from '#shared/fyrush'

const route = useRoute()
const toast = useToast()
const { refreshUser, logout } = useAuthSession()
const { incidents, history, fetchIncidents, fetchHistory, reportIncident } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()
const { rememberIncidents, notifyNewIncidents } = useIncidentPwaNotifications()

const locationPromptOpen = ref(false)
const mapDialogOpen = ref(false)
const useSetLocation = ref(true)
const pending = ref(false)
const manualMarker = ref<[number, number]>([BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const statusMessage = ref('Checking your session...')

const activeTab = computed<'dashboard' | 'history'>(() =>
  route.query.tab === 'history' ? 'history' : 'dashboard'
)

const setLocationPoint = computed<[number, number]>(() => [BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const latestIncident = computed(() => incidents.value[0] || null)
const dashboardHistory = computed(() => history.value.slice(0, 3))
const alreadyReported = computed(() => history.value.some(item => item.status !== INCIDENT_STATUS.COMPLETED))

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
    to: '/citizen/report',
    active: activeTab.value === 'dashboard'
  },
  {
    label: 'History',
    icon: 'i-lucide-history',
    to: '/citizen/report?tab=history',
    active: activeTab.value === 'history'
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
  rememberIncidents(incidents.value)
  connect()

  locationPromptOpen.value = true
  statusMessage.value = 'Confirm where the fire is, then tap REPORT FIRE three times quickly.'
})

onBeforeUnmount(() => disconnect())

watch(payload, async (value) => {
  if (!value?.incidents)
    return

  incidents.value = value.incidents as typeof incidents.value
  syncHistoryStatuses(value.incidents as IncidentFeedItem[])
  await notifyNewIncidents(value.incidents as IncidentFeedItem[])
})

function syncHistoryStatuses(nextIncidents: IncidentFeedItem[]) {
  const statusByIncident = new Map(nextIncidents.map(incident => [incident.id, incident.status]))

  history.value = history.value.map((item) => {
    const status = statusByIncident.get(item.id)
    return status ? { ...item, status } : item
  })
}

function confirmSetLocation() {
  useSetLocation.value = true
  locationPromptOpen.value = false
  mapDialogOpen.value = false
  statusMessage.value = 'Set location confirmed. Tap REPORT FIRE three times quickly.'
}

function chooseManualLocation() {
  useSetLocation.value = false
  locationPromptOpen.value = false
  mapDialogOpen.value = true
  statusMessage.value = 'Tap on the map to pin the exact fire location, then triple tap REPORT FIRE.'
}

function openMapDialog() {
  useSetLocation.value = false
  mapDialogOpen.value = true
}

async function selectTab(tab: 'dashboard' | 'history') {
  const query = tab === 'history'
    ? { ...route.query, tab: 'history' }
    : Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'tab'))

  await navigateTo({ path: '/citizen/report', query })
}

async function submitReport() {
  if (alreadyReported.value) {
    toast.add({
      title: 'Already reported',
      description: 'You already reported an active fire incident. Please wait for responder updates.',
      color: 'warning',
      icon: 'i-lucide-triangle-alert'
    })
    return
  }

  pending.value = true

  try {
    let result

    if (useSetLocation.value) {
      result = await reportIncident({ useRegistered: true })
    } else {
      result = await reportIncident({
        useRegistered: false,
        longitude: manualMarker.value[0],
        latitude: manualMarker.value[1],
        address: 'Manually pinned location'
      })
    }

    if (result.alreadyReported) {
      toast.add({
        title: 'Already reported',
        description: 'You already reported this active fire incident. Please wait for updates.',
        color: 'warning',
        icon: 'i-lucide-triangle-alert'
      })
      await fetchHistory()
      return
    }

    statusMessage.value = 'Fire report submitted successfully.'
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
        v-if="activeTab === 'dashboard'"
        :location-label="locationLabel"
        :location-detail="locationDetail"
        :pending="pending"
        :latest-incident="latestIncident"
        :history="dashboardHistory"
        :status-message="statusMessage"
        @open-submit="submitReport"
        @open-location-prompt="locationPromptOpen = true"
        @open-map="openMapDialog"
        @open-history="selectTab('history')"
      />

      <CitizenReportHistoryView
        v-else
        :history="history"
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
        v-if="activeTab === 'dashboard'"
        :location-label="locationLabel"
        :location-detail="locationDetail"
        :pending="pending"
        :latest-incident="latestIncident"
        :history="dashboardHistory"
        :status-message="statusMessage"
        @open-submit="submitReport"
        @open-map="openMapDialog"
        @open-history="selectTab('history')"
      />

      <CitizenReportHistoryView
        v-else
        :history="history"
        desktop
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
      v-model:manual-marker="manualMarker"
      :use-set-location="useSetLocation"
      :set-location-point="setLocationPoint"
      @choose-manual-location="chooseManualLocation"
      @confirm-set-location="confirmSetLocation"
    />
  </div>
</template>
