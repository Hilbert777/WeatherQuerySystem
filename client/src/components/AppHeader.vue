<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import CitySearchBox from "@/components/CitySearchBox.vue";
import { usePreferenceStore } from "@/stores/preferenceStore";

const emit = defineEmits<{
  search: [city: string];
  refresh: [];
}>();

const preferences = usePreferenceStore();
const router = useRouter();

const themeLabel = computed(() => (preferences.theme === "dark" ? "切换浅色" : "切换深色"));
const unitLabel = computed(() => (preferences.unit === "metric" ? "摄氏度" : "华氏度"));
const navItems = [
  { name: "首页", path: "/" },
  { name: "天气地图", path: "/weather-map" },
  { name: "预警地图", path: "/warning-map" }
];

function search(city: string) {
  emit("search", city);
}
</script>

<template>
  <header class="app-header">
    <button class="brand" type="button" aria-label="返回天气工作台" @click="router.push('/')">
      <span class="brand-mark">
        <img src="/weather.png" alt="" />
      </span>
      <span>
        <strong>Weather Console</strong>
        <small>城市天气管理</small>
      </span>
    </button>

    <nav class="app-nav" aria-label="主导航">
      <button
        v-for="item in navItems"
        :key="item.path"
        type="button"
        :class="{ active: router.currentRoute.value.path === item.path }"
        @click="router.push(item.path)"
      >
        {{ item.name }}
      </button>
    </nav>

    <CitySearchBox class="global-search" button-label="查询" @search="search" />

    <div class="header-actions">
      <button class="icon-button" type="button" aria-label="刷新天气" title="刷新天气" @click="emit('refresh')">
        ↻
      </button>
      <button class="text-button" type="button" :aria-label="`当前${unitLabel}，点击切换单位`" @click="preferences.toggleUnit">
        {{ preferences.unit === "metric" ? "°C" : "°F" }}
      </button>
      <button class="icon-button" type="button" :aria-label="themeLabel" :title="themeLabel" @click="preferences.toggleTheme">
        {{ preferences.theme === "dark" ? "☀" : "☾" }}
      </button>
    </div>
  </header>
</template>
