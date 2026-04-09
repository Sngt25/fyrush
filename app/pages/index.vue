<script setup lang="ts">
const {
  canInstall,
  installStatus,
  canVibrate,
  notificationPermission,
  geoStatus,
  authStatus,
  actionStatus,
  latitude,
  longitude,
  triggerInstall,
  requestNotifications,
  registerPasskey,
  authenticateWithPasskey,
  clearPasskey,
  vibrateDevice,
  requestLocation
} = useDeviceCapabilities()
</script>

<template>
  <UContainer class="py-10 space-y-8">
    <UPageHero
      title="Fyrush PWA Device Capabilities"
      description="Install the app and test notifications, biometrics (passkeys), geolocation, and vibration from one screen."
      :links="[{ label: canInstall ? 'Install app' : 'Install unavailable', icon: 'i-lucide-download', color: 'primary', disabled: !canInstall, onClick: triggerInstall }]"
    />

    <UAlert
      icon="i-lucide-download"
      title="Install Availability"
      :description="installStatus"
      color="neutral"
      variant="outline"
    />

    <UAlert
      icon="i-lucide-info"
      title="Status"
      :description="actionStatus"
      color="neutral"
      variant="subtle"
    />

    <div class="grid gap-4 md:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Notifications
          </h2>
        </template>

        <p class="text-sm text-muted mb-4">
          Permission: {{ notificationPermission }}
        </p>

        <UButton
          icon="i-lucide-bell"
          @click="requestNotifications"
        >
          Enable and send test notification
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Vibration
          </h2>
        </template>

        <p class="text-sm text-muted mb-4">
          Supported: {{ canVibrate ? 'Yes' : 'No' }}
        </p>

        <UButton
          icon="i-lucide-sparkles"
          @click="vibrateDevice"
        >
          Trigger vibration pattern
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Geolocation
          </h2>
        </template>

        <p class="text-sm text-muted mb-2">
          {{ geoStatus }}
        </p>

        <p
          v-if="latitude !== null && longitude !== null"
          class="text-sm mb-4"
        >
          Lat: {{ latitude.toFixed(6) }} | Lng: {{ longitude.toFixed(6) }}
        </p>

        <UButton
          icon="i-lucide-map-pin"
          @click="requestLocation"
        >
          Request current location
        </UButton>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-lg">
            Biometrics (Passkeys)
          </h2>
        </template>

        <p class="text-sm text-muted mb-4">
          {{ authStatus }}
        </p>

        <div class="flex flex-wrap gap-2">
          <UButton
            icon="i-lucide-fingerprint"
            @click="registerPasskey"
          >
            Register passkey
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-shield-check"
            @click="authenticateWithPasskey"
          >
            Authenticate
          </UButton>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="clearPasskey"
          >
            Clear saved passkey id
          </UButton>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
