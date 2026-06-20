<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { ClientApiError, searchLocations } from "@/api/weather";
import type { LocationSuggestion } from "@/types/weather";

const props = withDefaults(defineProps<{
  placeholder?: string;
  buttonLabel?: string;
  disabled?: boolean;
  autofocus?: boolean;
}>(), {
  placeholder: "搜索城市，如 上海 / Tokyo",
  buttonLabel: "查询",
  disabled: false,
  autofocus: false
});

const emit = defineEmits<{
  search: [city: string];
}>();

const query = ref("");
const suggestions = ref<LocationSuggestion[]>([]);
const loading = ref(false);
const open = ref(false);
const activeIndex = ref(-1);
const suggestionError = ref("");
const submitting = ref(false);
let timer: number | undefined;
let requestId = 0;

const inputId = `city-search-${Math.random().toString(36).slice(2, 9)}`;
const showPanel = computed(() => open.value && (suggestions.value.length > 0 || loading.value || Boolean(suggestionError.value)));

function normalizeCityText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[市县区镇乡旗盟州地区特别行政区省]+$/u, "");
}

function exactLocationMatch(value: string, items: LocationSuggestion[]) {
  const normalized = normalizeCityText(value);

  return items.find((item) => {
    const names = [
      item.name,
      item.localName,
      item.adm2,
      item.adm1
    ].filter(Boolean) as string[];

    return names.some((name) => normalizeCityText(name) === normalized);
  }) || null;
}

async function searchExactLocation(value: string) {
  const zhItems = await searchLocations(value, 5, "zh");
  const zhMatch = exactLocationMatch(value, zhItems);

  if (zhMatch) {
    return zhMatch;
  }

  const enItems = await searchLocations(value, 5, "en").catch(() => []);
  return exactLocationMatch(value, enItems);
}

function suggestionLabel(item: LocationSuggestion) {
  return [item.adm2, item.adm1, item.country].filter(Boolean).join(" · ");
}

function closePanel() {
  window.setTimeout(() => {
    if (loading.value || suggestionError.value) {
      return;
    }

    open.value = false;
    activeIndex.value = -1;
  }, 120);
}

async function submitSearch(city = query.value) {
  const value = city.trim();

  if (!value || props.disabled) {
    return;
  }

  window.clearTimeout(timer);
  const currentRequest = ++requestId;
  submitting.value = true;
  loading.value = true;
  open.value = true;
  suggestionError.value = "";
  suggestions.value = [];
  activeIndex.value = -1;

  try {
    const matched = await searchExactLocation(value);

    if (currentRequest !== requestId) {
      return;
    }

    if (!matched) {
      throw new ClientApiError(404, "CITY_NOT_FOUND", "城市不存在，请重新输入");
    }

    const matchedCity = matched.name;
    query.value = matchedCity;
    suggestions.value = [];
    open.value = false;
    activeIndex.value = -1;
    emit("search", matchedCity);
  } catch (error) {
    if (currentRequest !== requestId) {
      return;
    }

    suggestions.value = [];
    activeIndex.value = -1;
    suggestionError.value = error instanceof ClientApiError && error.code === "CITY_NOT_FOUND"
      ? "城市不存在，请重新输入"
      : error instanceof ClientApiError
        ? error.message
        : "城市建议暂时不可用";
    open.value = true;
  } finally {
    if (currentRequest === requestId) {
      loading.value = false;
      submitting.value = false;
    }
  }
}

function selectSuggestion(item: LocationSuggestion) {
  submitSearch(item.name);
}

function moveActive(step: number) {
  if (!suggestions.value.length) {
    return;
  }

  open.value = true;
  activeIndex.value = (activeIndex.value + step + suggestions.value.length) % suggestions.value.length;
}

function confirmActive() {
  if (activeIndex.value >= 0 && suggestions.value[activeIndex.value]) {
    selectSuggestion(suggestions.value[activeIndex.value]);
    return;
  }

  submitSearch();
}

watch(query, (value) => {
  window.clearTimeout(timer);
  suggestionError.value = "";

  if (submitting.value) {
    return;
  }

  const text = value.trim();
  if (text.length < 2) {
    suggestions.value = [];
    loading.value = false;
    return;
  }

  const currentRequest = ++requestId;
  timer = window.setTimeout(async () => {
    loading.value = true;
    open.value = true;

    try {
      const data = await searchLocations(text, 6);

      if (currentRequest !== requestId) {
        return;
      }

      suggestions.value = data;
      activeIndex.value = -1;
    } catch (error) {
      if (currentRequest !== requestId) {
        return;
      }

      suggestions.value = [];
      suggestionError.value = error instanceof ClientApiError ? error.message : "城市建议暂时不可用";
    } finally {
      if (currentRequest === requestId) {
        loading.value = false;
      }
    }
  }, 260);
});

onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <form class="city-search-box" role="search" @submit.prevent="submitSearch()">
    <div class="suggestion-wrap">
      <label class="sr-only" :for="inputId">搜索城市天气</label>
      <input
        :id="inputId"
        v-model="query"
        type="search"
        :placeholder="placeholder"
        :disabled="disabled"
        :autofocus="autofocus"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="showPanel"
        @focus="open = true"
        @blur="closePanel"
        @keydown.down.prevent="moveActive(1)"
        @keydown.up.prevent="moveActive(-1)"
        @keydown.enter.prevent="confirmActive"
        @keydown.esc.prevent="open = false"
      />

      <div v-if="showPanel" class="suggestion-panel" role="listbox">
        <div v-if="loading" class="suggestion-state">正在匹配城市...</div>
        <button
          v-for="(item, index) in suggestions"
          v-else
          :key="item.id"
          class="suggestion-item"
          :class="{ active: index === activeIndex }"
          type="button"
          role="option"
          @mousedown.prevent="selectSuggestion(item)"
        >
          <span>
            <strong>{{ item.name }}</strong>
            <small>{{ suggestionLabel(item) || "城市天气站点" }}</small>
          </span>
          <span class="suggestion-loc">{{ item.country || "天气" }}</span>
        </button>
        <div v-if="suggestionError && !loading" class="suggestion-state error">{{ suggestionError }}</div>
      </div>
    </div>

    <button class="primary-button" type="submit" :disabled="disabled || loading">
      {{ loading ? "查询中" : buttonLabel }}
    </button>
  </form>
</template>
