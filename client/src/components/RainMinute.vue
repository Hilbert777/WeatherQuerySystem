<script setup lang="ts">
import { computed } from "vue";
import type { WeatherErrorState } from "@/stores/weatherStore";
import type { MinutelyPrecipitation } from "@/types/weather";

const props = defineProps<{
  rain: MinutelyPrecipitation | null;
  loading?: boolean;
  error?: WeatherErrorState | null;
}>();

const bars = computed(() => (props.rain?.minutely || []).slice(0, 24));
const maxPrecipitation = computed(() => {
  return Math.max(...bars.value.map((item) => item.precipitation || 0), 0.1);
});
const totalPrecipitation = computed(() => {
  return bars.value.reduce((sum, item) => sum + (item.precipitation || 0), 0);
});

function barHeight(value: number | null) {
  return `${Math.max(((value || 0) / maxPrecipitation.value) * 100, value ? 8 : 3)}%`;
}
</script>

<template>
  <section class="panel rain-panel">
    <div class="panel-head">
      <div>
        <span class="eyebrow">分钟级降水</span>
        <h2>未来两小时雨势判断</h2>
      </div>
      <span v-if="loading" class="panel-state">更新中</span>
    </div>

    <div v-if="loading && !rain" class="rain-skeleton">
      <span v-for="item in 18" :key="item"></span>
    </div>

    <div v-else-if="error && !rain" class="module-empty">
      {{ error.message }}
    </div>

    <template v-else-if="rain">
      <div class="rain-summary">
        <strong>{{ totalPrecipitation > 0 ? "短时有降水" : "短时少雨" }}</strong>
        <p>{{ rain.summary || "未来两小时暂无明显降水信号。" }}</p>
      </div>

      <div v-if="bars.length" class="rain-bars" aria-label="分钟级降水柱状图">
        <span
          v-for="item in bars"
          :key="item.time"
          :style="{ height: barHeight(item.precipitation) }"
          :title="`${item.precipitation ?? 0} mm`"
        ></span>
      </div>
    </template>

    <div v-else class="module-empty">暂无分钟级降水数据</div>
  </section>
</template>
