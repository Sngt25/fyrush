<template>
  <UContainer class="py-12 max-w-2xl space-y-8">
    <div class="text-center space-y-3 flex flex-col items-center">
      <AppLogo class="w-full max-w-md h-auto" />
      <p class="text-sm text-muted">
        Barangay Kalipay fire reporting and BFP response platform
      </p>
    </div>

    <UCard class="fyrush-panel">
      <div class="grid gap-3">
        <UButton
          to="/citizen/auth"
          size="xl"
          color="error"
          block
        >
          Citizen Login / Sign Up
        </UButton>
        <UButton
          to="/bfp/login"
          size="xl"
          color="warning"
          block
        >
          BFP Personnel Login
        </UButton>
      </div>
    </UCard>
  </UContainer>
</template>
