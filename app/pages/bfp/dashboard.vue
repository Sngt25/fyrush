<script setup lang="ts">
import { INCIDENT_STATUS } from '#shared/fyrush'

const { user, logout } = useAuthSession()
const { incidents, fetchIncidents, updateIncidentStatus, updateResponderLocation, assignPointPerson } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()
const { rememberIncidents, notifyNewIncidents } = useIncidentPwaNotifications()
const { toMessage } = useError()
const route = useRoute()
const toast = useToast()

const actionError = ref('')
const logFilter = ref<'active' | 'history'>('active')
const pointPersonEmail = ref('')
const loadingPointPersons = ref(false)
const summary = ref<{
  totalRegisteredUsers: number
  activeReports: number
  totalPointPersons: number
  registeredPointPersons: number
  averageResponseMs: number | null
}>({
  totalRegisteredUsers: 0,
  activeReports: 0,
  totalPointPersons: 0,
  registeredPointPersons: 0,
  averageResponseMs: null
})

const pointPersons = ref<Array<{
  id: string
  email: string | null
  name: string
  mobile: string | null
  address: string | null
  registered: boolean
  createdAt: number
}>>([])

const positionWatches = new Map<string, number>()

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard' },
  { key: 'logs', label: 'Logs', icon: 'i-lucide-clipboard-list' },
  { key: 'point-person', label: 'Point Person', icon: 'i-lucide-users' }
] as const

type BfpView = (typeof navItems)[number]['key']

const activeView = computed<BfpView>(() => {
  const queryView = typeof route.query.view === 'string' ? route.query.view : 'dashboard'
  return navItems.some(item => item.key === queryView) ? queryView as BfpView : 'dashboard'
})

const activeIncidents = computed(() => incidents.value.filter(item => item.status !== INCIDENT_STATUS.COMPLETED && item.status !== INCIDENT_STATUS.INVALIDATED))
const historyIncidents = computed(() => incidents.value.filter(item => item.status === INCIDENT_STATUS.COMPLETED || item.status === INCIDENT_STATUS.INVALIDATED))
const logIncidents = computed(() => logFilter.value === 'active' ? activeIncidents.value : historyIncidents.value)

onMounted(async () => {
  await Promise.all([fetchIncidents(), fetchSummary(), fetchPointPersons()])
  rememberIncidents(incidents.value)
  connect()
})

onBeforeUnmount(() => {
  stopAllLiveShares()
  disconnect()
})

watch(payload, async (value) => {
  if (!value?.incidents)
    return

  incidents.value = value.incidents as typeof incidents.value
  await notifyNewIncidents(value.incidents as typeof incidents.value)
})

function formatElapsedMs(ms: number | null) {
  if (!ms || ms < 0)
    return 'N/A'

  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

function incidentPerformance(incident: {
  timerStartedAt: number | null
  closedAt: number | null
}) {
  if (!incident.timerStartedAt || !incident.closedAt)
    return null

  return incident.closedAt - incident.timerStartedAt
}

function statusBadgeColor(status: string) {
  if (status === INCIDENT_STATUS.NEW)
    return 'warning'
  if (status === INCIDENT_STATUS.VALIDATED)
    return 'info'
  if (status === INCIDENT_STATUS.ON_THE_WAY)
    return 'error'
  if (status === INCIDENT_STATUS.INVALIDATED)
    return 'neutral'
  return 'success'
}

async function fetchSummary() {
  const response = await $fetch<{ ok: boolean, summary: typeof summary.value }>('/api/bfp/summary')
  summary.value = response.summary
}

async function fetchPointPersons() {
  loadingPointPersons.value = true

  try {
    const response = await $fetch<{ ok: boolean, pointPersons: typeof pointPersons.value }>('/api/bfp/point-persons')
    pointPersons.value = response.pointPersons
  } finally {
    loadingPointPersons.value = false
  }
}

function stopLiveShare(incidentId: string) {
  if (!import.meta.client)
    return

  const watchId = positionWatches.get(incidentId)
  if (watchId === undefined)
    return

  navigator.geolocation.clearWatch(watchId)
  positionWatches.delete(incidentId)
}

function stopAllLiveShares() {
  for (const incidentId of positionWatches.keys())
    stopLiveShare(incidentId)
}

async function startLiveShare(incidentId: string) {
  if (!import.meta.client)
    return

  if (!navigator.geolocation) {
    actionError.value = 'Geolocation is not available.'
    return
  }

  if (positionWatches.has(incidentId))
    return

  const watchId = navigator.geolocation.watchPosition(async (position) => {
    try {
      await updateResponderLocation(incidentId, position.coords.latitude, position.coords.longitude)
    } catch (err) {
      actionError.value = toMessage(err, 'Unable to update responder location.')
    }
  }, (error) => {
    actionError.value = error.message
  }, {
    enableHighAccuracy: true,
    maximumAge: 2_000,
    timeout: 10_000
  })

  positionWatches.set(incidentId, watchId)
}

async function openView(view: BfpView) {
  const query = view === 'dashboard' ? {} : { view }
  await navigateTo({ path: '/bfp/dashboard', query })
}

async function runAction(incidentId: string, action: 'validate' | 'invalidate' | 'start_timer' | 'dispatch' | 'complete') {
  actionError.value = ''

  try {
    await updateIncidentStatus(incidentId, action)

    if (action === 'dispatch')
      await startLiveShare(incidentId)

    if (action === 'complete' || action === 'invalidate')
      stopLiveShare(incidentId)

    await fetchSummary()
  } catch (err) {
    actionError.value = toMessage(err, 'Action failed.')
  }
}

async function quickAssign(incidentId: string, userId?: string) {
  if (!userId)
    return

  try {
    await assignPointPerson(incidentId, userId)
    await fetchIncidents()
  } catch (err) {
    actionError.value = toMessage(err, 'Assign failed.')
  }
}

async function addPointPerson() {
  actionError.value = ''

  try {
    await $fetch('/api/bfp/point-persons', {
      method: 'POST',
      body: { email: pointPersonEmail.value }
    })

    pointPersonEmail.value = ''
    await Promise.all([fetchPointPersons(), fetchSummary()])
    toast.add({
      title: 'Point person saved',
      description: 'The email is now registered for point person onboarding.',
      color: 'success',
      icon: 'i-lucide-user-plus'
    })
  } catch (err) {
    actionError.value = toMessage(err, 'Unable to save point person email.')
  }
}

async function removePointPerson(id: string) {
  actionError.value = ''

  try {
    await $fetch(`/api/bfp/point-persons/${id}`, {
      method: 'DELETE'
    })

    await Promise.all([fetchPointPersons(), fetchSummary()])
  } catch (err) {
    actionError.value = toMessage(err, 'Unable to remove point person.')
  }
}

async function signOut() {
  stopAllLiveShares()
  await logout()
  await navigateTo('/')
}
</script>

<template>
  <UContainer class="py-6 max-w-7xl space-y-4">
    <div class="grid gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
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

          <div class="space-y-2">
            <UButton
              v-for="item in navItems"
              :key="item.key"
              :icon="item.icon"
              :color="activeView === item.key ? 'error' : 'neutral'"
              :variant="activeView === item.key ? 'solid' : 'ghost'"
              block
              @click="openView(item.key)"
            >
              {{ item.label }}
            </UButton>
          </div>

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

      <section class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h1 class="text-3xl font-black fyrush-title">
            {{ navItems.find(item => item.key === activeView)?.label }}
          </h1>
          <div class="flex gap-2">
            <UButton
              v-if="activeView === 'dashboard'"
              color="neutral"
              variant="outline"
              icon="i-lucide-history"
              @click="openView('logs'); logFilter = 'history'"
            >
              See History
            </UButton>
          </div>
        </div>

        <p
          v-if="actionError"
          class="text-sm text-error"
        >
          {{ actionError }}
        </p>

        <div
          v-if="activeView === 'dashboard'"
          class="space-y-4"
        >
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UCard class="fyrush-panel">
              <p class="text-xs text-muted">
                Total Registered Users
              </p>
              <p class="mt-2 text-2xl font-black">
                {{ summary.totalRegisteredUsers }}
              </p>
            </UCard>

            <UCard class="fyrush-panel">
              <p class="text-xs text-muted">
                Avg Response (Timer to Complete)
              </p>
              <p class="mt-2 text-2xl font-black">
                {{ formatElapsedMs(summary.averageResponseMs) }}
              </p>
            </UCard>

            <UCard class="fyrush-panel">
              <p class="text-xs text-muted">
                Active Fire Reports
              </p>
              <p class="mt-2 text-2xl font-black">
                {{ summary.activeReports }}
              </p>
            </UCard>

            <UCard class="fyrush-panel">
              <p class="text-xs text-muted">
                Registered Point Persons
              </p>
              <p class="mt-2 text-2xl font-black">
                {{ summary.registeredPointPersons }} / {{ summary.totalPointPersons }}
              </p>
            </UCard>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <UCard
              v-for="incident in activeIncidents"
              :key="incident.id"
              class="fyrush-panel"
            >
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <p class="font-bold">
                    {{ incident.address }}
                  </p>
                  <UBadge
                    :color="statusBadgeColor(incident.status)"
                    variant="soft"
                  >
                    {{ incident.status }}
                  </UBadge>
                </div>
              </template>

              <div class="space-y-2 text-sm">
                <p>Reports: {{ incident.reportCount }}</p>
                <p>Created: {{ new Date(incident.createdAt).toLocaleString() }}</p>
                <p>Current performance: {{ formatElapsedMs(incidentPerformance(incident)) }}</p>

                <div class="grid grid-cols-2 gap-2 pt-2">
                  <UButton
                    size="sm"
                    :disabled="incident.status !== INCIDENT_STATUS.NEW"
                    @click="runAction(incident.id, 'validate')"
                  >
                    Validate
                  </UButton>
                  <UButton
                    size="sm"
                    color="neutral"
                    :disabled="incident.status === INCIDENT_STATUS.COMPLETED || incident.status === INCIDENT_STATUS.INVALIDATED"
                    @click="runAction(incident.id, 'invalidate')"
                  >
                    Invalidate
                  </UButton>
                  <UButton
                    size="sm"
                    color="error"
                    :disabled="incident.status !== INCIDENT_STATUS.VALIDATED"
                    @click="runAction(incident.id, 'dispatch')"
                  >
                    Respond
                  </UButton>
                  <UButton
                    size="sm"
                    color="success"
                    :disabled="incident.status !== INCIDENT_STATUS.ON_THE_WAY"
                    @click="runAction(incident.id, 'complete')"
                  >
                    Complete
                  </UButton>
                </div>

                <div class="grid grid-cols-1 gap-2 pt-2">
                  <UButton
                    size="sm"
                    variant="outline"
                    @click="quickAssign(incident.id, incident.reportingUsers?.[0]?.userId)"
                  >
                    Assign 1st Reporter
                  </UButton>
                </div>
              </div>
            </UCard>

            <UCard
              v-if="activeIncidents.length === 0"
              class="fyrush-panel lg:col-span-2"
            >
              <p class="text-sm text-muted">
                No active fire reports right now.
              </p>
            </UCard>
          </div>
        </div>

        <div
          v-else-if="activeView === 'logs'"
          class="space-y-4"
        >
          <div class="flex gap-2">
            <UButton
              :color="logFilter === 'active' ? 'error' : 'neutral'"
              :variant="logFilter === 'active' ? 'solid' : 'outline'"
              @click="logFilter = 'active'"
            >
              Active Logs
            </UButton>
            <UButton
              :color="logFilter === 'history' ? 'error' : 'neutral'"
              :variant="logFilter === 'history' ? 'solid' : 'outline'"
              @click="logFilter = 'history'"
            >
              History
            </UButton>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <UCard
              v-for="incident in logIncidents"
              :key="incident.id"
              class="fyrush-panel"
            >
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <p class="font-bold">
                    {{ incident.address }}
                  </p>
                  <UBadge
                    :color="statusBadgeColor(incident.status)"
                    variant="soft"
                  >
                    {{ incident.status }}
                  </UBadge>
                </div>
              </template>

              <div class="space-y-2 text-sm">
                <p>Reports: {{ incident.reportCount }}</p>
                <p>Created: {{ new Date(incident.createdAt).toLocaleString() }}</p>
                <p>Timer performance: {{ formatElapsedMs(incidentPerformance(incident)) }}</p>

                <div class="grid grid-cols-2 gap-2 pt-2">
                  <UButton
                    size="sm"
                    :disabled="incident.status !== INCIDENT_STATUS.NEW"
                    @click="runAction(incident.id, 'validate')"
                  >
                    Validate
                  </UButton>
                  <UButton
                    size="sm"
                    color="neutral"
                    :disabled="incident.status === INCIDENT_STATUS.COMPLETED || incident.status === INCIDENT_STATUS.INVALIDATED"
                    @click="runAction(incident.id, 'invalidate')"
                  >
                    Invalidate
                  </UButton>
                  <UButton
                    size="sm"
                    color="error"
                    :disabled="incident.status !== INCIDENT_STATUS.VALIDATED"
                    @click="runAction(incident.id, 'dispatch')"
                  >
                    Respond
                  </UButton>
                  <UButton
                    size="sm"
                    color="success"
                    :disabled="incident.status !== INCIDENT_STATUS.ON_THE_WAY"
                    @click="runAction(incident.id, 'complete')"
                  >
                    Complete
                  </UButton>
                </div>

                <div
                  v-if="incident.reportingUsers?.length"
                  class="pt-2"
                >
                  <p class="font-semibold text-xs text-muted">
                    Reporting Users
                  </p>
                  <ul class="text-xs list-disc pl-4">
                    <li
                      v-for="reporter in incident.reportingUsers"
                      :key="reporter.userId + incident.id"
                    >
                      {{ reporter.userName }}
                    </li>
                  </ul>
                </div>
              </div>
            </UCard>

            <UCard
              v-if="logIncidents.length === 0"
              class="fyrush-panel lg:col-span-2"
            >
              <p class="text-sm text-muted">
                No log entries for this filter yet.
              </p>
            </UCard>
          </div>
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <UCard class="fyrush-panel">
            <template #header>
              <p class="font-bold text-lg">
                Add Point Person
              </p>
            </template>

            <div class="flex flex-col sm:flex-row gap-2">
              <UInput
                v-model="pointPersonEmail"
                type="email"
                placeholder="pointperson@example.com"
                class="flex-1"
              />
              <UButton
                color="error"
                :disabled="!pointPersonEmail"
                @click="addPointPerson"
              >
                Add
              </UButton>
            </div>
          </UCard>

          <UCard class="fyrush-panel">
            <template #header>
              <p class="font-bold text-lg">
                Point Person Directory
              </p>
            </template>

            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left border-b border-default">
                    <th class="py-2 pr-4">
                      Name
                    </th>
                    <th class="py-2 pr-4">
                      Mobile
                    </th>
                    <th class="py-2 pr-4">
                      Email
                    </th>
                    <th class="py-2 pr-4">
                      Address
                    </th>
                    <th class="py-2 pr-4">
                      Status
                    </th>
                    <th class="py-2 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="person in pointPersons"
                    :key="person.id"
                    class="border-b border-default"
                  >
                    <td class="py-2 pr-4">
                      {{ person.name }}
                    </td>
                    <td class="py-2 pr-4">
                      {{ person.mobile }}
                    </td>
                    <td class="py-2 pr-4">
                      {{ person.email }}
                    </td>
                    <td class="py-2 pr-4">
                      {{ person.address }}
                    </td>
                    <td class="py-2 pr-4">
                      <UBadge
                        :color="person.registered ? 'success' : 'warning'"
                        variant="soft"
                      >
                        {{ person.registered ? 'Registered' : 'Unregistered' }}
                      </UBadge>
                    </td>
                    <td class="py-2 text-right">
                      <UButton
                        size="xs"
                        color="error"
                        variant="outline"
                        icon="i-lucide-trash-2"
                        @click="removePointPerson(person.id)"
                      >
                        Delete
                      </UButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              v-if="!loadingPointPersons && pointPersons.length === 0"
              class="text-sm text-muted"
            >
              No point persons yet.
            </p>
          </UCard>
        </div>
      </section>
    </div>
  </UContainer>
</template>
