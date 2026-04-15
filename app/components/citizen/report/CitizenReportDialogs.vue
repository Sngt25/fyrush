<script setup lang="ts">
const props = defineProps<{
  locationPromptOpen: boolean
  mapDialogOpen: boolean
  useSetLocation: boolean
  manualMarker: [number, number]
  setLocationPoint: [number, number]
}>()

const emit = defineEmits<{
  'update:locationPromptOpen': [value: boolean]
  'update:mapDialogOpen': [value: boolean]
  'update:manualMarker': [value: [number, number]]
  'chooseManualLocation': []
  'confirmSetLocation': []
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
    :ui="{ body: 'space-y-3' }"
  >
    <template #body>
      <p class="text-xs text-muted">
        Tap on the map to set the exact fire point.
      </p>
      <CitizenReportMap
        v-model:manual-marker="manualMarkerModel"
        :user-has-registered-point="true"
        :registered-point="setLocationPoint"
      />
    </template>

    <template #footer>
      <div class="w-full flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          block
          @click="mapDialogModel = false"
        >
          Cancel
        </UButton>
        <UButton
          color="warning"
          block
          @click="mapDialogModel = false"
        >
          Use this pin
        </UButton>
      </div>
    </template>
  </UModal>
</template>
