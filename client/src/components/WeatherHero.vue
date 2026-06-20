<script setup lang="ts">
import { computed } from "vue";
import { usePreferenceStore } from "@/stores/preferenceStore";
import type { WeatherSummary } from "@/types/weather";
import { formatRelativeTime, formatTemperature, weatherAdvice, weatherIcon } from "@/utils/weather";

const props = defineProps<{
  summary: WeatherSummary | null;
  loading: boolean;
  isSaved: boolean;
}>();

const emit = defineEmits<{
  add: [city: string];
  openDetail: [city: string];
}>();

const preferences = usePreferenceStore();
const current = computed(() => props.summary?.current || null);
const today = computed(() => props.summary?.forecast.daily[0] || null);
const advice = computed(() => {
  if (!current.value) {
    return "选择或搜索一个城市，系统会展示当前天气与未来趋势。";
  }

  return weatherAdvice(current.value.description, current.value.humidity, current.value.windSpeed);
});
</script>

<template>
  <section class="weather-hero" :class="{ loading }">
    <div v-if="current" class="hero-content">
      <div class="hero-topline">
        <span>{{ current.adm1 || current.country || "实时天气" }}</span>
        <span>{{ formatRelativeTime(current.observedAt) }}更新</span>
      </div>

      <div class="hero-main">
        <div>
          <h1>{{ current.city }}</h1>
          <p>{{ advice }}</p>
        </div>
        <div class="weather-glyph" aria-hidden="true">{{ weatherIcon(current.icon) }}</div>
      </div>

      <div class="temperature-row">
        <strong>{{ formatTemperature(current.temperature, preferences.unitSymbol) }}</strong>
        <span>体感 {{ formatTemperature(current.feelsLike, preferences.unitSymbol) }}</span>
        <span v-if="today">今日 {{ formatTemperature(today.tempMin, preferences.unitSymbol) }} / {{ formatTemperature(today.tempMax, preferences.unitSymbol) }}</span>
      </div>

      <div class="hero-actions">
        <button class="primary-button" type="button" @click="emit('openDetail', current.city)">
          查看趋势
        </button>
        <button
          class="ghost-button"
          type="button"
          :disabled="isSaved"
          @click="emit('add', current.city)"
        >
          {{ isSaved ? "已在城市列表" : "加入我的城市" }}
        </button>
      </div>
    </div>

    <div v-else class="hero-empty">
      <span class="weather-glyph" aria-hidden="true">☀</span>
      <h1>选择城市开始查询</h1>
      <p>搜索城市后可查看实时天气、未来 5 天预报和趋势图。</p>
    </div>
  </section>
</template>

