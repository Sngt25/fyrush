<script setup lang="ts">
const props = withDefaults(defineProps<{
  center: [number, number]
  zoom?: number
  mapHeight?: string
  markers: Array<{
    id: string
    latitude: number
    longitude: number
    label?: string
    kind?: 'incident' | 'responder'
  }>
}>(), {
  zoom: 16,
  mapHeight: '20rem'
})

const markerIconByKind = {
  incident: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  responder: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png'
} as const

function markerIconUrl(kind: 'incident' | 'responder' = 'incident') {
  return markerIconByKind[kind]
}
</script>

<template>
  <UCard class="fyrush-panel overflow-hidden">
    <LMap
      :style="{ height: props.mapHeight, width: '100%' }"
      :zoom="props.zoom"
      :center="props.center"
      :use-global-leaflet="false"
    >
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        layer-type="base"
        name="OpenStreetMap"
      />

      <LMarker
        v-for="marker in props.markers"
        :key="marker.id"
        :lat-lng="[marker.latitude, marker.longitude]"
      >
        <LIcon
          :icon-url="markerIconUrl(marker.kind)"
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
            className: marker.kind === 'responder' ? 'bfp-tooltip' : 'incident-tooltip'
          }"
        >
          {{ marker.label || (marker.kind === 'responder' ? 'BFP Responder' : 'Reported Fire') }}
        </LTooltip>
      </LMarker>
    </LMap>
  </UCard>
</template>

<style scoped>
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
