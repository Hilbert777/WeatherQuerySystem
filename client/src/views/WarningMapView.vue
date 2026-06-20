<script setup lang="ts">
import { useRouter } from "vue-router";
import AppHeader from "@/components/AppHeader.vue";
import WorldWeatherMap from "@/components/WorldWeatherMap.vue";
import { useCityStore } from "@/stores/cityStore";

const router = useRouter();
const cities = useCityStore();

function openCity(city: string) {
  cities.setActiveCity(city);
  router.push(`/city/${encodeURIComponent(city)}`);
}
</script>

<template>
  <div class="app-shell map-page-shell">
    <AppHeader @search="openCity" @refresh="() => undefined" />
    <main class="map-page">
      <WorldWeatherMap
        mode="warning"
        title="全国城市灾害预警地图"
        @select="openCity"
      />
    </main>
  </div>
</template>
