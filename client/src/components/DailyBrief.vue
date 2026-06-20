<script setup lang="ts">
import { computed } from "vue";
import { usePreferenceStore } from "@/stores/preferenceStore";
import type { AirQuality, WeatherIndices, WeatherSummary, WeatherWarnings } from "@/types/weather";
import { formatTemperature, weatherAdvice } from "@/utils/weather";

const props = defineProps<{
  summary: WeatherSummary | null;
  indices: WeatherIndices | null;
  warnings: WeatherWarnings | null;
  air: AirQuality | null;
}>();

const preferences = usePreferenceStore();

const items = computed(() => {
  const current = props.summary?.current;
  const daily = props.summary?.forecast.daily[0];
  const warningCount = props.warnings?.warnings.length || 0;
  const reminders: Array<{ label: string; value: string; tone?: "danger" | "safe" }> = [];

  if (!current) {
    return reminders;
  }

  if (warningCount) {
    reminders.push({
      label: "预警",
      value: `${warningCount} 条生效预警，先看风险提醒`,
      tone: "danger"
    });
  } else {
    reminders.push({ label: "预警", value: "暂无生效预警", tone: "safe" });
  }

  const condition = `${current.description} ${daily?.description || ""}`;
  reminders.push({
    label: "出门",
    value: condition.includes("雨") || condition.includes("雪")
      ? "建议带伞，路面湿滑时放慢通勤节奏"
      : weatherAdvice(current.description, current.humidity, current.windSpeed)
  });

  reminders.push({
    label: "温度",
    value: daily
      ? `今日 ${formatTemperature(daily.tempMin, preferences.unitSymbol)} / ${formatTemperature(daily.tempMax, preferences.unitSymbol)}`
      : `当前 ${formatTemperature(current.temperature, preferences.unitSymbol)}`
  });

  const clothing = props.indices?.indices.find((item) => item.type === "3");
  if (clothing) {
    reminders.push({ label: "穿衣", value: clothing.category || clothing.text });
  }

  if (props.air?.aqi !== null && props.air?.aqi !== undefined) {
    reminders.push({
      label: "空气",
      value: `${props.air.category || "AQI"} ${props.air.aqi}`,
      tone: props.air.aqi > 100 ? "danger" : "safe"
    });
  }

  return reminders.slice(0, 5);
});
</script>

<template>
  <section class="daily-brief">
    <div class="panel-head">
      <div>
        <span class="eyebrow">今日提醒</span>
        <h2>出行前快速判断</h2>
      </div>
    </div>

    <div v-if="items.length" class="brief-list">
      <article
        v-for="item in items"
        :key="item.label"
        :class="item.tone"
      >
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
      </article>
    </div>
    <div v-else class="module-empty">等待天气数据生成提醒</div>
  </section>
</template>
