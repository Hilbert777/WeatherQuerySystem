<script setup lang="ts">
import { usePreferenceStore } from "@/stores/preferenceStore";
import type { ForecastDay } from "@/types/weather";
import { formatDate, formatTemperature, weatherIcon } from "@/utils/weather";

defineProps<{
  days: ForecastDay[];
}>();

const preferences = usePreferenceStore();
</script>

<template>
  <section class="forecast-strip" aria-label="未来五天预报">
    <article v-for="day in days" :key="day.date" class="forecast-card">
      <div>
        <strong>{{ day.weekday }}</strong>
        <small>{{ formatDate(day.date) }}</small>
      </div>
      <span class="forecast-icon">{{ weatherIcon(day.icon) }}</span>
      <p>{{ day.description }}</p>
      <div class="forecast-temp">
        <span>{{ formatTemperature(day.tempMin, preferences.unitSymbol) }}</span>
        <strong>{{ formatTemperature(day.tempMax, preferences.unitSymbol) }}</strong>
      </div>
      <small>{{ day.windDirectionText || "风向" }} {{ day.windSpeed ?? "--" }} {{ preferences.speedUnit }}</small>
    </article>
  </section>
</template>

