<script setup lang="ts">
import { computed } from "vue";
import type { WeatherErrorState } from "@/stores/weatherStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import type { HourlyForecast } from "@/types/weather";
import { formatTemperature, weatherIcon } from "@/utils/weather";

const props = defineProps<{
  forecast: HourlyForecast | null;
  loading?: boolean;
  error?: WeatherErrorState | null;
}>();

const preferences = usePreferenceStore();

const items = computed(() => (props.forecast?.hourly || []).slice(0, 12));

function formatHour(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
</script>

<template>
  <section class="panel hourly-panel">
    <div class="panel-head">
      <div>
        <span class="eyebrow">逐小时预报</span>
        <h2>未来 24 小时温度与降水</h2>
      </div>
      <span v-if="loading" class="panel-state">更新中</span>
    </div>

    <div v-if="loading && !forecast" class="hourly-skeleton">
      <span v-for="item in 8" :key="item"></span>
    </div>

    <div v-else-if="error && !forecast" class="module-empty">
      {{ error.message }}
    </div>

    <div v-else-if="items.length" class="hourly-strip">
      <article v-for="item in items" :key="item.time" class="hour-card">
        <small>{{ formatHour(item.time) }}</small>
        <span class="hour-icon">{{ weatherIcon(item.icon) }}</span>
        <strong>{{ formatTemperature(item.temperature ?? undefined, preferences.unitSymbol) }}</strong>
        <p>{{ item.condition }}</p>
        <span>{{ item.precipitation ?? 0 }} mm</span>
      </article>
    </div>

    <div v-else class="module-empty">暂无逐小时预报数据</div>
  </section>
</template>
