<script setup lang="ts">
import { computed } from "vue";
import { usePreferenceStore } from "@/stores/preferenceStore";
import type { CurrentWeather } from "@/types/weather";

const props = defineProps<{
  current: CurrentWeather | null;
}>();

const preferences = usePreferenceStore();

const metrics = computed(() => {
  const current = props.current;

  if (!current) {
    return [];
  }

  return [
    { label: "湿度", value: `${current.humidity}%`, detail: "空气含水量", icon: "◍" },
    { label: "风速", value: `${current.windSpeed} ${preferences.speedUnit}`, detail: current.windDirectionText || "风向待更新", icon: "↗" },
    { label: "气压", value: current.pressure ? `${current.pressure} hPa` : "--", detail: "海平面气压", icon: "▤" },
    { label: "能见度", value: current.visibility ? `${current.visibility} km` : "--", detail: "水平视程", icon: "◎" },
    { label: "降水", value: current.precipitation !== undefined ? `${current.precipitation} mm` : "--", detail: "近小时降水", icon: "☂" },
    { label: "云量", value: current.cloud !== null && current.cloud !== undefined ? `${current.cloud}%` : "--", detail: "天空覆盖度", icon: "☁" }
  ];
});
</script>

<template>
  <section class="metric-grid" aria-label="天气核心指标">
    <article v-for="metric in metrics" :key="metric.label" class="metric-card">
      <span class="metric-icon">{{ metric.icon }}</span>
      <span class="metric-label">{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
      <small>{{ metric.detail }}</small>
    </article>
  </section>
</template>

