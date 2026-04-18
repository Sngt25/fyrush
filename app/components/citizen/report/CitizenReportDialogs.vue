<script setup lang="ts">
const props = defineProps<{
  locationPromptOpen: boolean
  mapDialogOpen: boolean
  useSetLocation: boolean
  manualMarker: [number, number]
  setLocationPoint: [number, number]
  bfpSharedPoint: [number, number] | null
}>()

const emit = defineEmits<{
  'update:locationPromptOpen': [value: boolean]
  'update:mapDialogOpen': [value: boolean]
  'update:manualMarker': [value: [number, number]]
  'chooseManualLocation': []
  'confirmSetLocation': []
  'confirmManualLocation': []
}>()

const locationPromptModel = computed({
  get: () => props.locationPromptOpen,
  set: (value: boolean) => emit('update:locationPromptOpen', value)
})

const mapDialogModel = computed({
  get: () => props.mapDialogOpen,
  set: (value: boolean) => emit('update:mapDialogOpen', value)
})

const manualMarkerModel = computed({
  get: () => props.manualMarker,
  set: (value: [number, number]) => emit('update:manualMarker', value)
})

const draftManualMarker = ref<[number, number]>([props.manualMarker[0], props.manualMarker[1]])
const mapFullscreen = ref(false)

watch(() => props.mapDialogOpen, (isOpen) => {
  if (isOpen) {
    draftManualMarker.value = [props.manualMarker[0], props.manualMarker[1]]
    return
  }

  mapFullscreen.value = false
})

function usePinnedLocation() {
  manualMarkerModel.value = [draftManualMarker.value[0], draftManualMarker.value[1]]
  emit('confirmManualLocation')
  mapDialogModel.value = false
}

function useSetLocationFromMap() {
  emit('confirmSetLocation')
  mapDialogModel.value = false
}
</script>

<template>
  <UModal
    v-model:open="locationPromptModel"
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
          @click="$emit('chooseManualLocation')"
        >
          No, choose on map
        </UButton>
        <UButton
          color="error"
          block
          @click="$emit('confirmSetLocation')"
        >
          Yes, use set location
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="mapDialogModel"
    title="Choose Fire Location on Map"
    :fullscreen="mapFullscreen"
    :ui="{ body: 'space-y-3' }"
  >
    <template #body>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-muted">
          Tap on the map to set the exact fire point.
        </p>
        <UButton
          color="neutral"
          variant="outline"
          size="xs"
          :icon="mapFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          @click="mapFullscreen = !mapFullscreen"
        >
          {{ mapFullscreen ? 'Exit fullscreen' : 'Fullscreen' }}
        </UButton>
      </div>
      <CitizenReportMap
        v-model:manual-marker="draftManualMarker"
        :user-has-registered-point="true"
        :registered-point="setLocationPoint"
        :bfp-shared-point="bfpSharedPoint"
        :map-height="mapFullscreen ? 'calc(100dvh - 12rem)' : '24rem'"
      />
    </template>

    <template #footer>
      <div class="w-full flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          block
          @click="useSetLocationFromMap"
        >
          Use Set Location
        </UButton>
        <UButton
          color="warning"
          block
          @click="usePinnedLocation"
        >
          Use this pin
        </UButton>
      </div>
    </template>
  </UModal>
</template>
