<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppHeader from "@/components/AppHeader.vue";
import CityRail from "@/components/CityRail.vue";
import ErrorNotice from "@/components/ErrorNotice.vue";
import WorldWeatherMap from "@/components/WorldWeatherMap.vue";
import { useCityStore } from "@/stores/cityStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useWeatherStore } from "@/stores/weatherStore";

const router = useRouter();
const cities = useCityStore();
const preferences = usePreferenceStore();
const weather = useWeatherStore();
const notice = ref<{ code: string; message: string } | null>(null);

function setNotice(message: string, code = "NOTICE") {
  notice.value = { code, message };
  window.setTimeout(() => {
    if (notice.value?.message === message) {
      notice.value = null;
    }
  }, 3200);
}

function openCity(city: string) {
  const value = city.trim();

  if (!value) {
    setNotice("请输入城市名称");
    return;
  }

  preferences.addHistory(value);
  cities.setActiveCity(value);
  notice.value = null;
  router.push(`/city/${encodeURIComponent(value)}`);
}

function removeCity(city: string) {
  cities.removeCity(city);
  setNotice(`已删除 ${city}，可点击撤销恢复`);
}

function reorderCity(fromCity: string, toCity: string) {
  const fromIndex = cities.cities.findIndex((city) => city.name === fromCity);
  const toIndex = cities.cities.findIndex((city) => city.name === toCity);
  cities.reorder(fromIndex, toIndex);
}

async function refreshAll() {
  await weather.refreshCities(cities.cityNames);
}

onMounted(async () => {
  cities.setActiveCity(cities.defaultCity);

  cities.cityNames.forEach((city) => {
    weather.fetchSummary(city).catch(() => undefined);
    weather.fetchWarnings(city).catch(() => undefined);
  });
});
</script>

<template>
  <div class="app-shell">
    <AppHeader @search="openCity" @refresh="refreshAll" />

    <main class="dashboard-layout">
      <CityRail
        :cities="cities.sortedCities"
        :active-city="cities.activeCity"
        :pinned-city="cities.pinnedCity"
        :default-city="cities.defaultCity"
        @select="openCity"
        @remove="removeCity"
        @reorder="reorderCity"
        @pin="cities.pinCity"
        @set-default="cities.setDefaultCity"
      />

      <section class="content-column">
        <WorldWeatherMap
          dense
          :show-detail="false"
          title="中国城市天气地图"
          @select="openCity"
        />

        <ErrorNotice v-if="notice" :error="notice" @retry="notice = null" />

        <div v-if="cities.lastRemoved" class="undo-bar">
          <span>已删除 {{ cities.lastRemoved.name }}</span>
          <button type="button" @click="cities.undoRemove">撤销</button>
        </div>
      </section>
    </main>
  </div>
</template>
