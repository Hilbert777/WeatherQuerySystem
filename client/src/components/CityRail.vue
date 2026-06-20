<script setup lang="ts">
import { ref } from "vue";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useWeatherStore } from "@/stores/weatherStore";
import type { City } from "@/types/weather";
import { formatTemperature, weatherIcon } from "@/utils/weather";

const props = defineProps<{
  cities: City[];
  activeCity: string;
  pinnedCity: string;
  defaultCity: string;
}>();

const emit = defineEmits<{
  select: [city: string];
  remove: [city: string];
  reorder: [fromCity: string, toCity: string];
  pin: [city: string];
  setDefault: [city: string];
}>();

const preferences = usePreferenceStore();
const weatherStore = useWeatherStore();
const draggingIndex = ref<number | null>(null);

function onDragStart(index: number) {
  draggingIndex.value = index;
}

function onDrop(index: number) {
  if (draggingIndex.value === null) {
    return;
  }

  const fromCity = props.cities[draggingIndex.value]?.name;
  const toCity = props.cities[index]?.name;

  if (fromCity && toCity) {
    emit("reorder", fromCity, toCity);
  }

  draggingIndex.value = null;
}

function warningText(city: string) {
  const warnings = weatherStore.getWarnings(city)?.warnings || [];

  if (!warnings.length) {
    return "无预警";
  }

  return `${warnings.length} 条预警`;
}
</script>

<template>
  <aside class="city-rail">
    <div class="section-title">
      <span>我的城市</span>
      <small>{{ props.cities.length }} 个</small>
    </div>

    <div v-if="props.cities.length" class="city-list">
      <article
        v-for="(city, index) in props.cities"
        :key="city.id"
        class="city-item"
        :class="{ active: city.name === props.activeCity, dragging: draggingIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover.prevent
        @drop="onDrop(index)"
      >
        <button class="city-main" type="button" @click="emit('select', city.name)">
          <span class="drag-handle" aria-hidden="true">⋮⋮</span>
          <span class="mini-icon">
            {{ weatherIcon(weatherStore.getSummary(city.name, preferences.unit)?.current.icon) }}
          </span>
          <span class="city-copy">
            <strong>
              {{ city.name }}
              <span v-if="city.name === props.pinnedCity" class="city-badge">置顶</span>
              <span v-if="city.name === props.defaultCity" class="city-badge muted">默认</span>
            </strong>
            <small>
              {{ weatherStore.getSummary(city.name, preferences.unit)?.current.description || "等待刷新" }}
            </small>
            <small
              class="warning-chip"
              :class="{ danger: Boolean(weatherStore.getWarnings(city.name)?.warnings.length) }"
            >
              {{ warningText(city.name) }}
            </small>
          </span>
          <span class="city-temp">
            {{ formatTemperature(weatherStore.getSummary(city.name, preferences.unit)?.current.temperature, preferences.unitSymbol) }}
          </span>
        </button>
        <div class="city-controls">
          <button class="mini-action" type="button" :aria-label="`置顶${city.name}`" title="置顶" @click="emit('pin', city.name)">
            ↑
          </button>
          <button class="mini-action" type="button" :aria-label="`设${city.name}为默认城市`" title="设为默认" @click="emit('setDefault', city.name)">
            ★
          </button>
          <button class="delete-button" type="button" :aria-label="`删除${city.name}`" @click="emit('remove', city.name)">
            ×
          </button>
        </div>
      </article>
    </div>

    <div v-else class="empty-mini">
      <span>＋</span>
      <p>搜索城市后加入列表</p>
    </div>

    <div v-if="preferences.searchHistory.length" class="recent-searches">
      <div class="section-title">
        <span>最近搜索</span>
        <button type="button" @click="preferences.clearHistory">清空</button>
      </div>
      <div class="history-chips">
        <button
          v-for="city in preferences.searchHistory"
          :key="city"
          type="button"
          @click="emit('select', city)"
        >
          {{ city }}
        </button>
      </div>
    </div>
  </aside>
</template>
