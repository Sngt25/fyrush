<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { BARANGAY_KALIPAY_CENTER, INCIDENT_STATUS, type IncidentFeedItem } from '#shared/fyrush'

const route = useRoute()
const toast = useToast()
const { toMessage } = useAppError()
const { logout } = useAuthSession()
const { incidents, history, fetchIncidents, fetchHistory, reportIncident } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()
const { rememberIncidents, notifyNewIncidents } = useIncidentPwaNotifications()
const { canInstall, installStatus, pwaShowInstallPrompt, pwaIsInstalled, isStandalone, notificationPermission, pushSubscriptionStatus, pushSubscriptionChecked, triggerInstall, requestNotifications, checkPushSubscriptionStatus, ensurePushSubscription } = useDeviceCapabilities()

const PUSH_SUBSCRIPTION_ACTIVE = 'Push subscription is active on this device.'
const PUSH_SUBSCRIPTION_TOAST_ID = 'push-subscription-reminder'
const NOTIFICATION_BLOCKED_TOAST_ID = 'notification-blocked-reminder'

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
const alreadyReported = computed(() =>
  history.value.some(item => item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED)
)

const activeIncidentPins = computed(() =>
  incidents.value
    .filter(item => item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED)
    .map(item => ({
      incidentId: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address
    }))
)

const bfpSharedPoints = computed(() => {
  if (!payload.value?.responder)
    return []

  const incidentById = new Map(activeIncidentPins.value.map(item => [item.incidentId, item]))

  const activeResponders = payload.value.responder
    .filter(item => incidentById.has(item.incidentId))
    .map(item => ({
      incidentId: item.incidentId,
      latitude: item.latitude,
      longitude: item.longitude,
      updatedAt: item.updatedAt,
      address: incidentById.get(item.incidentId)?.address || 'Responder location'
    }))

  const latestResponder = activeResponders
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]

  if (!latestResponder)
    return []

  return [
    {
      incidentId: latestResponder.incidentId,
      latitude: latestResponder.latitude,
      longitude: latestResponder.longitude,
      address: latestResponder.address
    }
  ]
})

const locationLabel = computed(() =>
  useSetLocation.value ? 'Location: Barangay Kalipay' : 'Location: Manual map pin'
)

const notificationHelpVisible = computed(() => notificationPermission.value === 'denied')
const pushNeedsSubscription = computed(() =>
  pushSubscriptionChecked.value
  && notificationPermission.value === 'granted'
  && pushSubscriptionStatus.value !== PUSH_SUBSCRIPTION_ACTIVE
)
const installDebugVisible = computed(() => route.query.installDebug === '1')

let pushSubscriptionToastTimer: ReturnType<typeof setTimeout> | null = null
let notificationBlockedToastTimer: ReturnType<typeof setTimeout> | null = null

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
    to: '/citizen/profile'
  }
])

onMounted(async () => {
  await Promise.all([fetchIncidents(), fetchHistory()])
  rememberIncidents(incidents.value)
  connect()

  if (notificationPermission.value === 'default')
    await requestNotifications()

  await checkPushSubscriptionStatus()
  queuePushSubscriptionToast()
  queueNotificationBlockedToast()

  locationPromptOpen.value = true
  statusMessage.value = 'Confirm where the fire is, then tap REPORT FIRE three times quickly.'
})

onBeforeUnmount(() => {
  if (pushSubscriptionToastTimer)
    clearTimeout(pushSubscriptionToastTimer)

  if (notificationBlockedToastTimer)
    clearTimeout(notificationBlockedToastTimer)

  disconnect()
})

watch(notificationPermission, (value) => {
  if (value === 'denied') {
    queueNotificationBlockedToast()
    return
  }

  toast.remove(NOTIFICATION_BLOCKED_TOAST_ID)
})

function queuePushSubscriptionToast() {
  if (pushSubscriptionToastTimer)
    clearTimeout(pushSubscriptionToastTimer)

  pushSubscriptionToastTimer = setTimeout(() => {
    if (!pushNeedsSubscription.value)
      return

    toast.add({
      id: PUSH_SUBSCRIPTION_TOAST_ID,
      title: 'Enable background alerts',
      description: pushSubscriptionStatus.value,
      color: 'primary',
      icon: 'i-lucide-bell-ring',
      duration: 0,
      actions: [
        {
          label: 'Enable now',
          color: 'primary',
          variant: 'solid',
          onClick: handleSubscribeClick
        },
        {
          label: 'Later',
          color: 'neutral',
          variant: 'ghost'
        }
      ]
    })
  }, 900)
}

function queueNotificationBlockedToast() {
  if (!notificationHelpVisible.value)
    return

  if (notificationBlockedToastTimer)
    clearTimeout(notificationBlockedToastTimer)

  notificationBlockedToastTimer = setTimeout(() => {
    if (!notificationHelpVisible.value)
      return

    toast.add({
      id: NOTIFICATION_BLOCKED_TOAST_ID,
      title: 'Notifications are blocked',
      description: 'Enable notifications in browser/app settings to receive fire alerts and vibration.',
      color: 'warning',
      icon: 'i-lucide-bell-off'
    })
  }, 700)
}

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
  manualMarker.value = [setLocationPoint.value[0], setLocationPoint.value[1]]
  locationPromptOpen.value = false
  mapDialogOpen.value = false
  statusMessage.value = 'Set location confirmed. Tap REPORT FIRE three times quickly.'
}

function chooseManualLocation() {
  locationPromptOpen.value = false
  mapDialogOpen.value = true
  statusMessage.value = 'Tap on the map, then confirm with Use this pin before reporting.'
}

function openMapDialog() {
  mapDialogOpen.value = true
}

function confirmManualLocation() {
  useSetLocation.value = false
  locationPromptOpen.value = false
  mapDialogOpen.value = false
  statusMessage.value = 'Manual pin confirmed. Tap REPORT FIRE three times quickly.'
}

async function selectTab(tab: 'dashboard' | 'history') {
  const query = tab === 'history'
    ? { ...route.query, tab: 'history' }
    : Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'tab'))

  await navigateTo({ path: '/citizen/report', query })
}

async function handleInstallClick() {
  const result = await triggerInstall()
  const color = result.status === 'error'
    ? 'error'
    : (result.status === 'opened' ? 'success' : 'warning')

  toast.add({
    title: 'Install App',
    description: result.message,
    color,
    icon: result.status === 'error' ? 'i-lucide-circle-x' : 'i-lucide-download'
  })
}

async function handleSubscribeClick() {
  if (notificationPermission.value !== 'granted') {
    await requestNotifications()
    await checkPushSubscriptionStatus()
    queuePushSubscriptionToast()
    return
  }

  await ensurePushSubscription()
  await checkPushSubscriptionStatus()

  if (!pushNeedsSubscription.value) {
    toast.remove(PUSH_SUBSCRIPTION_TOAST_ID)
    toast.add({
      title: 'Background alerts enabled',
      description: 'Push subscription is active on this device.',
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
  } else {
    queuePushSubscriptionToast()
  }
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
    statusMessage.value = toMessage(err, 'Report submission failed.')
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
      <CitizenReportMobileHeader
        :show-install="canInstall"
        @install-app="handleInstallClick"
        @sign-out="signOut"
      />

      <div
        v-if="installDebugVisible"
        class="px-3 pt-3"
      >
        <UCard class="border border-warning/40 bg-warning/5">
          <template #header>
            <p class="text-xs font-bold tracking-wide uppercase">
              Install Debug
            </p>
          </template>

          <div class="space-y-1 text-xs">
            <p>showInstallPrompt: <span class="font-bold">{{ String(pwaShowInstallPrompt) }}</span></p>
            <p>isPWAInstalled: <span class="font-bold">{{ String(pwaIsInstalled) }}</span></p>
            <p>isStandalone: <span class="font-bold">{{ String(isStandalone) }}</span></p>
            <p>canInstall: <span class="font-bold">{{ String(canInstall) }}</span></p>
            <p>installStatus: <span class="font-bold">{{ installStatus }}</span></p>
          </div>
        </UCard>
      </div>

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
        :show-install="canInstall"
        @install-app="handleInstallClick"
        @open-location-prompt="locationPromptOpen = true"
        @sign-out="signOut"
      />

      <div
        v-if="installDebugVisible"
        class="px-6 pt-4"
      >
        <UCard class="border border-warning/40 bg-warning/5">
          <template #header>
            <p class="text-xs font-bold tracking-wide uppercase">
              Install Debug
            </p>
          </template>

          <div class="grid gap-2 text-xs sm:grid-cols-2">
            <p>showInstallPrompt: <span class="font-bold">{{ String(pwaShowInstallPrompt) }}</span></p>
            <p>isPWAInstalled: <span class="font-bold">{{ String(pwaIsInstalled) }}</span></p>
            <p>isStandalone: <span class="font-bold">{{ String(isStandalone) }}</span></p>
            <p>canInstall: <span class="font-bold">{{ String(canInstall) }}</span></p>
            <p class="sm:col-span-2">
              installStatus: <span class="font-bold">{{ installStatus }}</span>
            </p>
          </div>
        </UCard>
      </div>

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
      :bfp-shared-points="bfpSharedPoints"
      :incident-pins="activeIncidentPins"
      @choose-manual-location="chooseManualLocation"
      @confirm-set-location="confirmSetLocation"
      @confirm-manual-location="confirmManualLocation"
    />
  </div>
</template>
