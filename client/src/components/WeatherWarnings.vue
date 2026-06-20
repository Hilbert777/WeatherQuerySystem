<script setup lang="ts">
import { computed } from "vue";
import type { WeatherErrorState } from "@/stores/weatherStore";
import type { WeatherWarning } from "@/types/weather";
import { formatRelativeTime } from "@/utils/weather";

const props = defineProps<{
  warnings: WeatherWarning[];
  loading?: boolean;
  error?: WeatherErrorState | null;
}>();

const sortedWarnings = computed(() => {
  const severityRank: Record<string, number> = {
    Extreme: 0,
    Severe: 1,
    Moderate: 2,
    Minor: 3
  };

  return [...props.warnings].sort((a, b) => {
    const left = severityRank[a.severity || ""] ?? 9;
    const right = severityRank[b.severity || ""] ?? 9;
    return left - right;
  });
});
</script>

<template>
  <section class="panel warning-panel">
    <div class="panel-head">
      <div>
        <span class="eyebrow">灾害预警</span>
        <h2>风险提醒与防护建议</h2>
      </div>
      <span v-if="loading" class="panel-state">更新中</span>
    </div>

    <div v-if="loading && !warnings.length" class="warning-skeleton">
      <span></span>
    </div>

    <div v-else-if="error && !warnings.length" class="module-empty warning-empty">
      {{ error.message }}
    </div>

    <div v-else-if="sortedWarnings.length" class="warning-list">
      <article
        v-for="item in sortedWarnings"
        :key="item.id"
        class="warning-card"
        :style="item.severityColor ? { '--warning-color': item.severityColor } : undefined"
      >
        <div class="warning-mark">!</div>
        <div>
          <small>{{ item.sender || item.typeName || "气象预警" }}</small>
          <strong>{{ item.title || item.typeName || "天气预警" }}</strong>
          <p>{{ item.instruction || item.text || "请关注当地气象部门发布的最新信息。" }}</p>
          <span v-if="item.publishedAt">{{ formatRelativeTime(item.publishedAt) }}发布</span>
        </div>
      </article>
    </div>

    <div v-else class="module-empty safe-state">
      <strong>暂无生效预警</strong>
      <span>当前城市未查询到正在生效的灾害预警。</span>
    </div>
  </section>
</template>
