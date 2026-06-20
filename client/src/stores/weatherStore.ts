import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  ClientApiError,
  getAirQuality as requestAirQuality,
  getHourlyForecast,
  getMinutelyPrecipitation,
  getWeatherIndices,
  getWeatherSummaryResponse,
  getWeatherWarnings
} from "@/api/weather";
import { usePreferenceStore } from "@/stores/preferenceStore";
import type {
  AirQuality,
  ApiMeta,
  HourlyForecast,
  MinutelyPrecipitation,
  UnitMode,
  WeatherIndices,
  WeatherSummary,
  WeatherWarnings
} from "@/types/weather";

export interface WeatherErrorState {
  code: string;
  message: string;
}

function cacheKey(city: string, unit: UnitMode) {
  return `${city.trim().toLowerCase()}::${unit}`;
}

function cityKey(city: string) {
  return city.trim().toLowerCase();
}

function apiErrorState(error: unknown, fallback: string): WeatherErrorState {
  return {
    code: error instanceof ClientApiError ? error.code : "WEATHER_PROVIDER_ERROR",
    message: error instanceof ClientApiError ? error.message : fallback
  };
}

export const useWeatherStore = defineStore("weather", () => {
  const summaries = ref<Record<string, WeatherSummary>>({});
  const indices = ref<Record<string, WeatherIndices>>({});
  const hourlyForecasts = ref<Record<string, HourlyForecast>>({});
  const minutelyPrecipitations = ref<Record<string, MinutelyPrecipitation>>({});
  const warnings = ref<Record<string, WeatherWarnings>>({});
  const airQuality = ref<Record<string, AirQuality>>({});
  const loading = ref<Record<string, boolean>>({});
  const indicesLoading = ref<Record<string, boolean>>({});
  const hourlyLoading = ref<Record<string, boolean>>({});
  const minutelyLoading = ref<Record<string, boolean>>({});
  const warningsLoading = ref<Record<string, boolean>>({});
  const airLoading = ref<Record<string, boolean>>({});
  const errors = ref<Record<string, WeatherErrorState>>({});
  const indicesErrors = ref<Record<string, WeatherErrorState>>({});
  const hourlyErrors = ref<Record<string, WeatherErrorState>>({});
  const minutelyErrors = ref<Record<string, WeatherErrorState>>({});
  const warningsErrors = ref<Record<string, WeatherErrorState>>({});
  const airErrors = ref<Record<string, WeatherErrorState>>({});
  const lastUpdated = ref<Record<string, string>>({});
  const summaryMeta = ref<Record<string, ApiMeta>>({});

  const hasAnyLoading = computed(() => Object.values(loading.value).some(Boolean));

  function getSummary(city: string, unit: UnitMode) {
    return summaries.value[cacheKey(city, unit)] || null;
  }

  function getError(city: string, unit: UnitMode) {
    return errors.value[cacheKey(city, unit)] || null;
  }

  function getSummaryMeta(city: string, unit: UnitMode) {
    return summaryMeta.value[cacheKey(city, unit)] || null;
  }

  function getIndices(city: string) {
    return indices.value[cityKey(city)] || null;
  }

  function getIndicesError(city: string) {
    return indicesErrors.value[cityKey(city)] || null;
  }

  function getHourly(city: string, unit: UnitMode) {
    return hourlyForecasts.value[cacheKey(city, unit)] || null;
  }

  function getHourlyError(city: string, unit: UnitMode) {
    return hourlyErrors.value[cacheKey(city, unit)] || null;
  }

  function getMinutely(city: string) {
    return minutelyPrecipitations.value[cityKey(city)] || null;
  }

  function getMinutelyError(city: string) {
    return minutelyErrors.value[cityKey(city)] || null;
  }

  function getWarnings(city: string) {
    return warnings.value[cityKey(city)] || null;
  }

  function getWarningsError(city: string) {
    return warningsErrors.value[cityKey(city)] || null;
  }

  function getAirQuality(city: string) {
    return airQuality.value[cityKey(city)] || null;
  }

  function getAirError(city: string) {
    return airErrors.value[cityKey(city)] || null;
  }

  async function fetchSummary(city: string, options: { force?: boolean } = {}) {
    const preferences = usePreferenceStore();
    const key = cacheKey(city, preferences.unit);
    const existing = summaries.value[key];

    if (existing && !options.force) {
      return existing;
    }

    loading.value[key] = true;
    delete errors.value[key];

    try {
      const response = await getWeatherSummaryResponse(city, preferences.unit);
      summaries.value[key] = response.data;
      summaryMeta.value[key] = response.meta;
      lastUpdated.value[key] = response.meta.updatedAt || new Date().toISOString();
      return response.data;
    } catch (error) {
      errors.value[key] = apiErrorState(error, "天气服务暂时不可用");
      throw error;
    } finally {
      loading.value[key] = false;
    }
  }

  async function refreshCities(cities: string[]) {
    await Promise.allSettled(cities.map((city) => fetchSummary(city, { force: true })));
  }

  async function fetchIndices(city: string, options: { force?: boolean } = {}) {
    const key = cityKey(city);
    const existing = indices.value[key];

    if (existing && !options.force) {
      return existing;
    }

    indicesLoading.value[key] = true;
    delete indicesErrors.value[key];

    try {
      const data = await getWeatherIndices(city);
      indices.value[key] = data;
      return data;
    } catch (error) {
      indicesErrors.value[key] = apiErrorState(error, "生活建议暂时不可用");
      throw error;
    } finally {
      indicesLoading.value[key] = false;
    }
  }

  async function fetchHourly(city: string, options: { force?: boolean } = {}) {
    const preferences = usePreferenceStore();
    const key = cacheKey(city, preferences.unit);
    const existing = hourlyForecasts.value[key];

    if (existing && !options.force) {
      return existing;
    }

    hourlyLoading.value[key] = true;
    delete hourlyErrors.value[key];

    try {
      const data = await getHourlyForecast(city, preferences.unit);
      hourlyForecasts.value[key] = data;
      return data;
    } catch (error) {
      hourlyErrors.value[key] = apiErrorState(error, "逐小时预报暂时不可用");
      throw error;
    } finally {
      hourlyLoading.value[key] = false;
    }
  }

  async function fetchMinutely(city: string, options: { force?: boolean } = {}) {
    const key = cityKey(city);
    const existing = minutelyPrecipitations.value[key];

    if (existing && !options.force) {
      return existing;
    }

    minutelyLoading.value[key] = true;
    delete minutelyErrors.value[key];

    try {
      const data = await getMinutelyPrecipitation(city);
      minutelyPrecipitations.value[key] = data;
      return data;
    } catch (error) {
      minutelyErrors.value[key] = apiErrorState(error, "分钟级降水暂时不可用");
      throw error;
    } finally {
      minutelyLoading.value[key] = false;
    }
  }

  async function fetchWarnings(city: string, options: { force?: boolean } = {}) {
    const key = cityKey(city);
    const existing = warnings.value[key];

    if (existing && !options.force) {
      return existing;
    }

    warningsLoading.value[key] = true;
    delete warningsErrors.value[key];

    try {
      const data = await getWeatherWarnings(city);
      warnings.value[key] = data;
      return data;
    } catch (error) {
      warningsErrors.value[key] = apiErrorState(error, "天气预警暂时不可用");
      throw error;
    } finally {
      warningsLoading.value[key] = false;
    }
  }

  async function fetchAir(city: string, options: { force?: boolean } = {}) {
    const key = cityKey(city);
    const existing = airQuality.value[key];

    if (existing && !options.force) {
      return existing;
    }

    airLoading.value[key] = true;
    delete airErrors.value[key];

    try {
      const data = await requestAirQuality(city);
      airQuality.value[key] = data;
      return data;
    } catch (error) {
      airErrors.value[key] = apiErrorState(error, "空气质量暂时不可用");
      throw error;
    } finally {
      airLoading.value[key] = false;
    }
  }

  async function fetchCityExtras(city: string, options: { force?: boolean } = {}) {
    await Promise.allSettled([
      fetchIndices(city, options),
      fetchHourly(city, options),
      fetchMinutely(city, options),
      fetchWarnings(city, options),
      fetchAir(city, options)
    ]);
  }

  function isLoading(city: string, unit: UnitMode) {
    return Boolean(loading.value[cacheKey(city, unit)]);
  }

  function getLastUpdated(city: string, unit: UnitMode) {
    return lastUpdated.value[cacheKey(city, unit)] || "";
  }

  function isIndicesLoading(city: string) {
    return Boolean(indicesLoading.value[cityKey(city)]);
  }

  function isHourlyLoading(city: string, unit: UnitMode) {
    return Boolean(hourlyLoading.value[cacheKey(city, unit)]);
  }

  function isMinutelyLoading(city: string) {
    return Boolean(minutelyLoading.value[cityKey(city)]);
  }

  function isWarningsLoading(city: string) {
    return Boolean(warningsLoading.value[cityKey(city)]);
  }

  function isAirLoading(city: string) {
    return Boolean(airLoading.value[cityKey(city)]);
  }

  return {
    summaries,
    indices,
    hourlyForecasts,
    minutelyPrecipitations,
    warnings,
    airQuality,
    loading,
    indicesLoading,
    hourlyLoading,
    minutelyLoading,
    warningsLoading,
    airLoading,
    errors,
    indicesErrors,
    hourlyErrors,
    minutelyErrors,
    warningsErrors,
    airErrors,
    lastUpdated,
    summaryMeta,
    hasAnyLoading,
    getSummary,
    getError,
    getSummaryMeta,
    getIndices,
    getIndicesError,
    getHourly,
    getHourlyError,
    getMinutely,
    getMinutelyError,
    getWarnings,
    getWarningsError,
    getAirQuality,
    getAirError,
    getLastUpdated,
    fetchSummary,
    fetchIndices,
    fetchHourly,
    fetchMinutely,
    fetchWarnings,
    fetchAir,
    fetchCityExtras,
    refreshCities,
    isLoading,
    isIndicesLoading,
    isHourlyLoading,
    isMinutelyLoading,
    isWarningsLoading,
    isAirLoading
  };
});
