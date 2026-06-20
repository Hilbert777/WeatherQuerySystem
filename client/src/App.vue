<script setup lang="ts">
import { computed } from "vue";
import { useCityStore } from "@/stores/cityStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useWeatherStore } from "@/stores/weatherStore";

const cities = useCityStore();
const preferences = usePreferenceStore();
const weather = useWeatherStore();

const weatherScene = computed(() => {
  const summary = cities.activeCity ? weather.getSummary(cities.activeCity, preferences.unit) : null;
  const text = summary?.current.description || "";
  const icon = summary?.current.icon || "";

  if (text.includes("雷") || ["302", "303", "304"].includes(icon)) {
    return "storm";
  }

  if (text.includes("雨") || icon.startsWith("3")) {
    return "rain";
  }

  if (text.includes("雪") || icon.startsWith("4")) {
    return "snow";
  }

  if (text.includes("雾") || text.includes("霾") || icon.startsWith("5")) {
    return "mist";
  }

  if (text.includes("云") || ["101", "102", "103", "104"].includes(icon)) {
    return "cloud";
  }

  return "sunny";
});
</script>

<template>
  <div class="weather-scene" :class="`scene-${weatherScene}`" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </div>
  <RouterView />
</template>
