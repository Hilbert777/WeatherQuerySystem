import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { readStorage, writeStorage } from "@/composables/useLocalStorage";
import type { City } from "@/types/weather";

const CITIES_KEY = "weather.myCities";
const ACTIVE_CITY_KEY = "weather.activeCity";
const PINNED_CITY_KEY = "weather.pinnedCity";
const DEFAULT_CITY_KEY = "weather.defaultCity";

function createCity(name: string): City {
  const cleanName = name.trim();

  return {
    id: cleanName.toLowerCase(),
    name: cleanName,
    addedAt: new Date().toISOString()
  };
}

export const useCityStore = defineStore("cities", () => {
  const cities = ref<City[]>(readStorage<City[]>(CITIES_KEY, [
    createCity("北京"),
    createCity("上海"),
    createCity("杭州")
  ]));
  const activeCity = ref("");
  const pinnedCity = ref(readStorage<string>(PINNED_CITY_KEY, "北京"));
  const defaultCity = ref(readStorage<string>(DEFAULT_CITY_KEY, "北京"));
  const lastRemoved = ref<City | null>(null);

  const sortedCities = computed(() => {
    if (!pinnedCity.value) {
      return cities.value;
    }

    return [...cities.value].sort((left, right) => {
      if (left.name === pinnedCity.value) {
        return -1;
      }

      if (right.name === pinnedCity.value) {
        return 1;
      }

      return 0;
    });
  });
  const cityNames = computed(() => sortedCities.value.map((city) => city.name));

  function hasCity(name: string) {
    return cities.value.some((city) => city.name.toLowerCase() === name.trim().toLowerCase());
  }

  function addCity(name: string) {
    const cleanName = name.trim();

    if (!cleanName) {
      return false;
    }

    if (!hasCity(cleanName)) {
      cities.value.push(createCity(cleanName));
    }

    activeCity.value = cleanName;
    return true;
  }

  function removeCity(name: string) {
    const index = cities.value.findIndex((city) => city.name.toLowerCase() === name.trim().toLowerCase());

    if (index === -1) {
      return;
    }

    lastRemoved.value = cities.value[index];
    cities.value.splice(index, 1);

    if (activeCity.value.toLowerCase() === name.trim().toLowerCase()) {
      activeCity.value = cities.value[0]?.name || "";
    }

    if (pinnedCity.value.toLowerCase() === name.trim().toLowerCase()) {
      pinnedCity.value = cities.value[0]?.name || "";
    }

    if (defaultCity.value.toLowerCase() === name.trim().toLowerCase()) {
      defaultCity.value = cities.value[0]?.name || "";
    }
  }

  function undoRemove() {
    if (!lastRemoved.value) {
      return;
    }

    if (!hasCity(lastRemoved.value.name)) {
      cities.value.push(lastRemoved.value);
    }

    lastRemoved.value = null;
  }

  function setActiveCity(name: string) {
    activeCity.value = name;
  }

  function pinCity(name: string) {
    const cleanName = name.trim();

    if (!cleanName || !hasCity(cleanName)) {
      return;
    }

    pinnedCity.value = cleanName;
  }

  function setDefaultCity(name: string) {
    const cleanName = name.trim();

    if (!cleanName || !hasCity(cleanName)) {
      return;
    }

    defaultCity.value = cleanName;
  }

  function reorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    const next = [...cities.value];
    const [item] = next.splice(fromIndex, 1);

    if (!item) {
      return;
    }

    next.splice(toIndex, 0, item);
    cities.value = next;
  }

  watch(cities, (value) => writeStorage(CITIES_KEY, value), { deep: true });
  watch(activeCity, (value) => writeStorage(ACTIVE_CITY_KEY, value));
  watch(pinnedCity, (value) => writeStorage(PINNED_CITY_KEY, value));
  watch(defaultCity, (value) => writeStorage(DEFAULT_CITY_KEY, value));

  return {
    cities,
    sortedCities,
    cityNames,
    activeCity,
    pinnedCity,
    defaultCity,
    lastRemoved,
    hasCity,
    addCity,
    removeCity,
    undoRemove,
    setActiveCity,
    pinCity,
    setDefaultCity,
    reorder
  };
});
