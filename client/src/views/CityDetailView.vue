<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import AirQualityPanel from "@/components/AirQualityPanel.vue";
import DailyBrief from "@/components/DailyBrief.vue";
import ErrorNotice from "@/components/ErrorNotice.vue";
import ForecastStrip from "@/components/ForecastStrip.vue";
import HourlyForecast from "@/components/HourlyForecast.vue";
import LifestyleAdvice from "@/components/LifestyleAdvice.vue";
import MetricGrid from "@/components/MetricGrid.vue";
import RainMinute from "@/components/RainMinute.vue";
import WeatherWarnings from "@/components/WeatherWarnings.vue";
import WeatherChart from "@/components/WeatherChart.vue";
import WeatherHero from "@/components/WeatherHero.vue";
import WeatherSkeleton from "@/components/WeatherSkeleton.vue";
import { useCityStore } from "@/stores/cityStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useWeatherStore } from "@/stores/weatherStore";
import { formatRelativeTime, formatTemperature, weatherIcon } from "@/utils/weather";

const props = defineProps<{
  cityName: string;
}>();

const router = useRouter();
const cities = useCityStore();
const preferences = usePreferenceStore();
const weather = useWeatherStore();

const city = computed(() => decodeURIComponent(props.cityName));
const summary = computed(() => weather.getSummary(city.value, preferences.unit));
const summaryMeta = computed(() => weather.getSummaryMeta(city.value, preferences.unit));
const error = computed(() => weather.getError(city.value, preferences.unit));
const loading = computed(() => weather.isLoading(city.value, preferences.unit));
const indices = computed(() => weather.getIndices(city.value));
const indicesLoading = computed(() => weather.isIndicesLoading(city.value));
const hourly = computed(() => weather.getHourly(city.value, preferences.unit));
const hourlyLoading = computed(() => weather.isHourlyLoading(city.value, preferences.unit));
const minutely = computed(() => weather.getMinutely(city.value));
const minutelyLoading = computed(() => weather.isMinutelyLoading(city.value));
const warnings = computed(() => weather.getWarnings(city.value));
const warningsLoading = computed(() => weather.isWarningsLoading(city.value));
const air = computed(() => weather.getAirQuality(city.value));
const airLoading = computed(() => weather.isAirLoading(city.value));

async function load(force = false) {
  await Promise.allSettled([
    weather.fetchSummary(city.value, { force }),
    weather.fetchCityExtras(city.value, { force })
  ]);
}

function addCity(name: string) {
  cities.addCity(name);
}

onMounted(() => {
  cities.setActiveCity(city.value);
  load();
});

watch(() => preferences.unit, () => load(true));
</script>

<template>
  <div class="app-shell detail-shell">
    <header class="detail-topbar">
      <button class="ghost-button" type="button" @click="router.push('/')">← 返回首页</button>
      <div>
        <span class="eyebrow">城市详情</span>
        <h1>{{ city }}</h1>
        <small class="topbar-meta">
          {{ formatRelativeTime(weather.getLastUpdated(city, preferences.unit)) }}更新
          <span v-if="summaryMeta?.cached"> · 缓存数据</span>
        </small>
      </div>
      <div class="detail-actions">
        <button class="text-button" type="button" @click="preferences.toggleUnit">
          {{ preferences.unit === "metric" ? "°C" : "°F" }}
        </button>
        <button class="icon-button" type="button" aria-label="切换主题" @click="preferences.toggleTheme">
          {{ preferences.theme === "dark" ? "☀" : "☾" }}
        </button>
        <button class="primary-button" type="button" :disabled="loading" @click="load(true)">
          {{ loading ? "刷新中" : "刷新" }}
        </button>
      </div>
    </header>

    <main class="detail-grid">
      <section class="detail-main">
        <ErrorNotice :error="error" @retry="load(true)" />
        <WeatherSkeleton v-if="loading && !summary" />
        <template v-else>
          <WeatherHero
            :summary="summary"
            :loading="loading"
            :is-saved="summary ? cities.hasCity(summary.current.city) : false"
            @add="addCity"
            @open-detail="() => undefined"
          />
          <MetricGrid :current="summary?.current || null" />
        </template>
        <WeatherWarnings
          :warnings="warnings?.warnings || []"
          :loading="warningsLoading"
          :error="weather.getWarningsError(city)"
        />
        <LifestyleAdvice :items="indices?.indices || []" :loading="indicesLoading" />
      </section>

      <aside class="detail-side panel">
        <span class="eyebrow">今日观察</span>
        <h2>{{ summary?.current.description || "等待天气数据" }}</h2>
        <div v-if="summary" class="today-mini">
          <span>{{ weatherIcon(summary.current.icon) }}</span>
          <strong>{{ formatTemperature(summary.current.temperature, preferences.unitSymbol) }}</strong>
          <p>{{ summary.current.adm1 || summary.current.country }} · {{ summary.current.windDirectionText || "风向待更新" }}</p>
          <small>
            {{ formatRelativeTime(weather.getLastUpdated(city, preferences.unit)) }}更新
            <template v-if="summaryMeta?.cached"> · 后端缓存</template>
          </small>
        </div>
        <DailyBrief
          class="detail-brief"
          :summary="summary"
          :indices="indices"
          :warnings="warnings"
          :air="air"
        />
      </aside>

      <section class="detail-insights">
        <AirQualityPanel
          :air="air"
          :loading="airLoading"
          :error="weather.getAirError(city)"
        />
        <RainMinute
          :rain="minutely"
          :loading="minutelyLoading"
          :error="weather.getMinutelyError(city)"
        />
      </section>

      <HourlyForecast
        class="detail-hourly"
        :forecast="hourly"
        :loading="hourlyLoading"
        :error="weather.getHourlyError(city, preferences.unit)"
      />

      <section class="panel chart-panel">
        <div class="panel-head">
          <div>
            <span class="eyebrow">趋势图</span>
            <h2>未来五天温度与湿度变化</h2>
          </div>
        </div>
        <WeatherChart :days="summary?.forecast.daily || []" />
      </section>

      <section class="panel detail-forecast">
        <div class="panel-head">
          <div>
            <span class="eyebrow">详细预报</span>
            <h2>逐日天气摘要</h2>
          </div>
        </div>
        <ForecastStrip :days="summary?.forecast.daily || []" />
      </section>
    </main>
  </div>
</template>
