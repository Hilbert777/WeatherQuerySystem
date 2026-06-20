<script setup lang="ts">
import { computed } from "vue";
import type { WeatherIndex } from "@/types/weather";

const props = defineProps<{
  items: WeatherIndex[];
  loading?: boolean;
}>();

const iconMap: Record<string, string> = {
  "1": "☂",
  "2": "🚗",
  "3": "◐",
  "5": "☀",
  "8": "◎",
  "9": "+"
};

const preferredOrder = ["1", "3", "5", "8", "2", "9"];

const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    const left = preferredOrder.indexOf(a.type);
    const right = preferredOrder.indexOf(b.type);
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
  });
});
</script>

<template>
  <section class="panel lifestyle-panel">
    <div class="panel-head">
      <div>
        <span class="eyebrow">生活建议</span>
        <h2>出行、穿衣与健康参考</h2>
      </div>
    </div>

    <div v-if="loading && !items.length" class="lifestyle-skeleton">
      <span v-for="item in 6" :key="item"></span>
    </div>

    <div v-else-if="sortedItems.length" class="lifestyle-grid">
      <article v-for="item in sortedItems" :key="item.type" class="lifestyle-card">
        <span class="lifestyle-icon">{{ iconMap[item.type] || "◇" }}</span>
        <div>
          <small>{{ item.name }}</small>
          <strong>{{ item.category }}</strong>
        </div>
        <p>{{ item.text }}</p>
      </article>
    </div>

    <div v-else class="chart-empty">暂无生活建议数据</div>
  </section>
</template>
