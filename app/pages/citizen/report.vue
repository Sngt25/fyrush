<script setup lang="ts">
import { BARANGAY_KALIPAY_CENTER } from '#shared/fyrush'

const { user, refreshUser, logout } = useAuthSession()
const { incidents, history, fetchIncidents, fetchHistory, reportIncident } = useIncidents()
const { payload, connect, disconnect } = useIncidentSocket()

const reportMode = ref<'registered' | 'manual'>('registered')
const confirmOpen = ref(false)
const manualMarker = ref<[number, number]>([BARANGAY_KALIPAY_CENTER.lng, BARANGAY_KALIPAY_CENTER.lat])
const pending = ref(false)
const statusMessage = ref('Ready to report.')
const registeredPoint = computed<[number, number] | null>(() => {
  const lng = user.value?.registeredLng
  const lat = user.value?.registeredLat

  if (!userHasRegisteredPoint.value || typeof lng !== 'number' || typeof lat !== 'number')
    return null

  return [lng, lat]
})

onMounted(async () => {
  const current = await refreshUser()
  if (!current || current.role === 'bfp') {
    await navigateTo('/citizen/auth')
    return
  }

  await Promise.all([fetchIncidents(), fetchHistory()])
  connect()
})

onBeforeUnmount(() => disconnect())

watch(payload, (value) => {
  if (value?.incidents)
    incidents.value = value.incidents as typeof incidents.value
})

const latestIncident = computed(() => incidents.value[0] || null)
const userHasRegisteredPoint = computed(() => typeof user.value?.registeredLat === 'number' && typeof user.value?.registeredLng === 'number')

async function submitReport() {
  pending.value = true

  try {
    if (reportMode.value === 'registered') {
      await reportIncident({ useRegistered: true, address: user.value?.address || 'Registered address' })
    } else {
      await reportIncident({
        useRegistered: false,
        longitude: manualMarker.value[0],
        latitude: manualMarker.value[1],
        address: 'Manually pinned location'
      })
    }

    statusMessage.value = 'Fire report submitted successfully.'
    confirmOpen.value = false
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
  <UContainer class="py-6 max-w-5xl space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-black fyrush-title">
          Fyrush Citizen Panel
        </h1>
        <p class="text-sm text-muted">
          Welcome, {{ user?.name }}
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        @click="signOut"
      >
        Logout
      </UButton>
    </div>

    <UAlert
      title="3-Tap Fire Report"
      description="1) Confirm location 2) Confirm report 3) Submit"
      color="error"
      variant="subtle"
    />

    <UCard class="fyrush-panel space-y-4">
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p class="font-semibold">
            Location: {{ user?.address || 'Barangay Kalipay' }}
          </p>
          <p class="text-xs text-muted">
            GPS active and map pin override available
          </p>
        </div>
        <UButton
          color="error"
          size="xl"
          @click="confirmOpen = true"
        >
          Report Fire
        </UButton>
      </div>

      <p class="text-sm">
        {{ statusMessage }}
      </p>
    </UCard>

    <CitizenReportMap
      v-model:manual-marker="manualMarker"
      :user-has-registered-point="userHasRegisteredPoint"
      :registered-point="registeredPoint"
    />

    <div class="grid md:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h2 class="font-bold">
            Latest Incident
          </h2>
        </template>

        <p
          v-if="latestIncident"
          class="text-sm"
        >
          {{ latestIncident.address }} • {{ latestIncident.status }} • {{ latestIncident.reportCount }} reports
        </p>
        <p
          v-else
          class="text-sm text-muted"
        >
          No incidents yet.
        </p>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-bold">
            History Log
          </h2>
        </template>

        <ul class="space-y-2 text-sm">
          <li
            v-for="item in history"
            :key="item.id"
            class="border-b border-default pb-2"
          >
            {{ item.address }} • {{ item.status }}
          </li>
        </ul>
      </UCard>
    </div>

    <UModal
      v-model:open="confirmOpen"
      title="Is your registered area the location of the fire?"
    >
      <template #body>
        <div class="space-y-4">
          <URadioGroup
            v-model="reportMode"
            :items="[
              { label: 'Yes, use registered location', value: 'registered', disabled: !userHasRegisteredPoint },
              { label: 'No, I pinned on map', value: 'manual' }
            ]"
          />

          <p class="text-xs text-muted">
            If you are out of town, choose manual pin and tap map to set exact fire point.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="w-full flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            block
            @click="confirmOpen = false"
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
