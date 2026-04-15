<script setup lang="ts">
interface IncidentCard {
  status: string
  address: string
}

interface HistoryItem {
  id: string
  status: string
  address: string
}

defineProps<{
  locationLabel: string
  locationDetail: string
  pending: boolean
  latestIncident: IncidentCard | null
  history: HistoryItem[]
  statusMessage: string
}>()

defineEmits<{
  openSubmit: []
  openMap: []
}>()
</script>

<template>
  <main class="flex-1 min-h-0 overflow-y-auto p-6">
    <div class="grid grid-cols-12 gap-6">
      <section class="col-span-7 space-y-5">
        <UCard class="fyrush-location-card border-none">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-map-pin"
                class="size-7 mt-0.5 text-(--fyrush-ink)"
              />
              <div>
                <p class="font-extrabold text-xl text-(--fyrush-ink)">
                  {{ locationLabel }}
                </p>
                <p class="text-sm text-(--fyrush-ink)/85">
                  {{ locationDetail }}
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-map"
              @click="$emit('openMap')"
            >
              Open Map
            </UButton>
          </div>
        </UCard>

        <UCard class="fyrush-panel">
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Emergency Action
            </p>
            <UButton
              color="error"
              size="xl"
              block
              icon="i-lucide-flame"
              :loading="pending"
              @click="$emit('openSubmit')"
            >
              Report Fire Now
            </UButton>
            <UAlert
              :title="statusMessage"
              color="info"
              variant="soft"
            />
          </div>
        </UCard>
      </section>

      <section class="col-span-5 space-y-4">
        <UCard
          v-if="latestIncident"
          class="bg-(--fyrush-ink) text-white border-none"
        >
          <template #header>
            <h2 class="font-bold text-lg">
              Latest Incident
            </h2>
          </template>
          <p class="font-semibold capitalize">
            {{ latestIncident.status }}
          </p>
          <p class="text-sm text-white/85 mt-1">
            {{ latestIncident.address }}
          </p>
        </UCard>

        <UCard v-else>
          <template #header>
            <h2 class="font-bold text-lg">
              Latest Incident
            </h2>
          </template>
          <p class="text-sm text-muted">
            No incident history yet.
          </p>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-black fyrush-title">
              History Log
            </h2>
          </template>
          <ul
            v-if="history.length > 0"
            class="space-y-2 text-sm"
          >
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
          <p
            v-else
            class="text-sm text-muted"
          >
            No incident history yet.
          </p>
        </UCard>
      </section>
    </div>
  </main>
</template>
