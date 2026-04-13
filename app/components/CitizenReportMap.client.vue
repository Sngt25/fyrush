<script setup lang="ts">
defineProps<{
  manualMarker: [number, number]
  userHasRegisteredPoint: boolean
  registeredPoint: [number, number] | null
}>()

const emit = defineEmits<{
  'update:manualMarker': [value: [number, number]]
}>()

function onMapClick(event: unknown) {
  const typed = event as { latlng?: { lat: number, lng: number } }
  const latlng = typed.latlng
  if (!latlng)
    return

  emit('update:manualMarker', [latlng.lng, latlng.lat])
}
</script>

<template>
  <UCard class="overflow-hidden">
    <LMap
      style="height: 24rem; width: 100%"
      :zoom="19"
      :center="[manualMarker[1], manualMarker[0]]"
      :use-global-leaflet="false"
      @click="onMapClick"
    >
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&amp;copy; <a href='https://www.openstreetmap.org/'>OpenStreetMap</a> contributors"
        layer-type="base"
        name="OpenStreetMap"
      />
      <LMarker :lat-lng="[manualMarker[1], manualMarker[0]]" />
      <LMarker
        v-if="userHasRegisteredPoint && registeredPoint"
        :lat-lng="[registeredPoint[1], registeredPoint[0]]"
      />
    </LMap>
  </UCard>
</template>
