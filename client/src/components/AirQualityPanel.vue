<script setup lang="ts">
import { computed } from "vue";
import type { WeatherErrorState } from "@/stores/weatherStore";
import type { AirQuality } from "@/types/weather";

const props = defineProps<{
  air: AirQuality | null;
  loading?: boolean;
  error?: WeatherErrorState | null;
}>();

const topPollutants = computed(() => {
  return (props.air?.pollutants || [])
    .filter((item) => item.concentration !== null)
    .slice(0, 6);
});

const aqiTone = computed(() => {
  const aqi = props.air?.aqi;

  if (aqi === null || aqi === undefined) {
    return "unknown";
  }

  if (aqi <= 50) {
    return "good";
  }

  if (aqi <= 100) {
    return "moderate";
  }

  return "poor";
});
</script>

<template>
  <section class="panel air-panel">
    <div class="panel-head">
      <div>
        <span class="eyebrow">空气质量</span>
        <h2>AQI 与污染物浓度</h2>
      </div>
      <span v-if="loading" class="panel-state">更新中</span>
    </div>

    <div v-if="loading && !air" class="air-skeleton">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <div v-else-if="error && !air" class="module-empty">
      {{ error.message }}
    </div>

    <template v-else-if="air">
      <div class="air-summary" :class="`aqi-${aqiTone}`">
        <div>
          <small>实时 AQI</small>
          <strong>{{ air.aqi ?? "--" }}</strong>
        </div>
        <div>
          <span>{{ air.category || "暂无评级" }}</span>
          <p>{{ air.health.advice.general || air.health.effect || "空气质量建议待更新。" }}</p>
        </div>
      </div>

      <div v-if="topPollutants.length" class="pollutant-grid">
        <article v-for="item in topPollutants" :key="item.code">
          <small>{{ item.name || item.code.toUpperCase() }}</small>
          <strong>{{ item.concentration }}</strong>
          <span>{{ item.unit }}</span>
        </article>
      </div>
    </template>

    <div v-else class="module-empty">暂无空气质量数据</div>
  </section>
</template>
