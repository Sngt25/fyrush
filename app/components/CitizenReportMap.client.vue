<script setup lang="ts">
const emit = defineEmits<{
  'update:manualMarker': [value: [number, number]]
}>()

const props = withDefaults(defineProps<{
  manualMarker: [number, number]
  userHasRegisteredPoint: boolean
  registeredPoint: [number, number] | null
  showManualMarker?: boolean
  bfpSharedPoints?: Array<{
    incidentId: string
    latitude: number
    longitude: number
    address: string
  }>
  incidentPins?: Array<{
    incidentId: string
    latitude: number
    longitude: number
    address: string
  }>
  mapHeight?: string
}>(), {
  bfpSharedPoints: () => [],
  incidentPins: () => [],
  showManualMarker: true,
  mapHeight: '24rem'
})

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
      :key="props.mapHeight"
      :style="{ height: props.mapHeight, width: '100%' }"
      :zoom="19"
      :center="[props.manualMarker[1], props.manualMarker[0]]"
      :use-global-leaflet="false"
      @click="onMapClick"
    >
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      />
      <LMarker
        v-if="props.showManualMarker"
        :lat-lng="[props.manualMarker[1], props.manualMarker[0]]"
      />

      <LMarker
        v-for="incidentPin in props.incidentPins"
        :key="`incident-${incidentPin.incidentId}`"
        :lat-lng="[incidentPin.latitude, incidentPin.longitude]"
      >
        <LIcon
          icon-url="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png"
          shadow-url="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
          :icon-size="[25, 41]"
          :icon-anchor="[12, 41]"
          :popup-anchor="[1, -34]"
          :shadow-size="[41, 41]"
        />
        <LTooltip
          :options="{
            permanent: true,
            direction: 'top',
            offset: [0, -28],
            className: 'incident-tooltip'
          }"
        >
          Reported Fire
        </LTooltip>
      </LMarker>

      <LMarker
        v-if="props.userHasRegisteredPoint && props.registeredPoint"
        :lat-lng="[props.registeredPoint[1], props.registeredPoint[0]]"
      >
        <LIcon
          icon-url="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"
          shadow-url="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
          :icon-size="[25, 41]"
          :icon-anchor="[12, 41]"
          :popup-anchor="[1, -34]"
          :shadow-size="[41, 41]"
        />
        <LTooltip
          :options="{
            permanent: true,
            direction: 'top',
            offset: [0, -28],
            className: 'set-location-tooltip'
          }"
        >
          Set Location
        </LTooltip>
      </LMarker>

      <LMarker
        v-for="sharedPoint in props.bfpSharedPoints"
        :key="`bfp-${sharedPoint.incidentId}`"
        :lat-lng="[sharedPoint.latitude, sharedPoint.longitude]"
      >
        <LIcon
          icon-url="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png"
          shadow-url="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
          :icon-size="[25, 41]"
          :icon-anchor="[12, 41]"
          :popup-anchor="[1, -34]"
          :shadow-size="[41, 41]"
        />
        <LTooltip
          :options="{
            permanent: true,
            direction: 'top',
            offset: [0, -28],
            className: 'bfp-tooltip'
          }"
        >
          BFP Responder
        </LTooltip>
      </LMarker>
    </LMap>
  </UCard>
</template>

<style scoped>
:deep(.set-location-tooltip) {
  background: #1d4ed8;
  border: 1px solid #1e40af;
  border-radius: 9999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
}

:deep(.set-location-tooltip::before) {
  display: none;
}

:deep(.incident-tooltip) {
  background: #9a3412;
  border: 1px solid #7c2d12;
  border-radius: 9999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
}

:deep(.incident-tooltip::before) {
  display: none;
}

:deep(.bfp-tooltip) {
  background: #991b1b;
  border: 1px solid #7f1d1d;
  border-radius: 9999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
}

:deep(.bfp-tooltip::before) {
  display: none;
}
</style>
