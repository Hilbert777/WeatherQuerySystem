import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { readStorage, writeStorage } from "@/composables/useLocalStorage";
import type { ThemeMode, UnitMode } from "@/types/weather";

const THEME_KEY = "weather.theme";
const UNIT_KEY = "weather.unit";
const HISTORY_KEY = "weather.searchHistory";

function detectInitialTheme(): ThemeMode {
  const saved = readStorage<ThemeMode | null>(THEME_KEY, null);

  if (saved) {
    return saved;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const usePreferenceStore = defineStore("preferences", () => {
  const theme = ref<ThemeMode>(detectInitialTheme());
  const unit = ref<UnitMode>(readStorage<UnitMode>(UNIT_KEY, "metric"));
  const searchHistory = ref<string[]>(readStorage<string[]>(HISTORY_KEY, []));

  const unitSymbol = computed(() => (unit.value === "metric" ? "°C" : "°F"));
  const speedUnit = computed(() => (unit.value === "metric" ? "km/h" : "mph"));

  function applyTheme() {
    document.documentElement.dataset.theme = theme.value;
  }

  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }

  function toggleUnit() {
    unit.value = unit.value === "metric" ? "imperial" : "metric";
  }

  function addHistory(city: string) {
    const normalized = city.trim();

    if (!normalized) {
      return;
    }

    searchHistory.value = [
      normalized,
      ...searchHistory.value.filter((item) => item.toLowerCase() !== normalized.toLowerCase())
    ].slice(0, 10);
  }

  function clearHistory() {
    searchHistory.value = [];
  }

  watch(theme, (value) => {
    applyTheme();
    writeStorage(THEME_KEY, value);
  }, { immediate: true });

  watch(unit, (value) => writeStorage(UNIT_KEY, value), { immediate: true });
  watch(searchHistory, (value) => writeStorage(HISTORY_KEY, value), { deep: true });

  return {
    theme,
    unit,
    unitSymbol,
    speedUnit,
    searchHistory,
    toggleTheme,
    toggleUnit,
    addHistory,
    clearHistory
  };
});

