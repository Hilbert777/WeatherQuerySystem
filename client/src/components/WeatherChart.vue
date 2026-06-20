<script setup lang="ts">
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePreferenceStore } from "@/stores/preferenceStore";
import type { ForecastDay } from "@/types/weather";
import { formatDate } from "@/utils/weather";

echarts.use([LineChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const props = defineProps<{
  days: ForecastDay[];
}>();

const preferences = usePreferenceStore();
const chartEl = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;

const options = computed(() => {
  const labels = props.days.map((day) => `${day.weekday} ${formatDate(day.date)}`);
  const textColor = preferences.theme === "dark" ? "#e8f3f1" : "#172522";
  const gridColor = preferences.theme === "dark" ? "rgba(232, 243, 241, 0.14)" : "rgba(23, 37, 34, 0.12)";

  return {
    color: ["#f28c38", "#277a78", "#83b6a7"],
    tooltip: {
      trigger: "axis",
      backgroundColor: preferences.theme === "dark" ? "#13201f" : "#ffffff",
      borderColor: gridColor,
      textStyle: { color: textColor }
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: textColor }
    },
    grid: {
      left: 38,
      right: 18,
      top: 46,
      bottom: 32
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: gridColor } },
      axisLabel: { color: textColor }
    },
    yAxis: [
      {
        type: "value",
        axisLabel: { color: textColor },
        splitLine: { lineStyle: { color: gridColor } }
      }
    ],
    series: [
      {
        name: `最高温 ${preferences.unitSymbol}`,
        type: "line",
        smooth: true,
        symbolSize: 9,
        lineStyle: { width: 3 },
        data: props.days.map((day) => day.tempMax)
      },
      {
        name: `最低温 ${preferences.unitSymbol}`,
        type: "line",
        smooth: true,
        symbolSize: 9,
        lineStyle: { width: 3 },
        data: props.days.map((day) => day.tempMin)
      },
      {
        name: "湿度 %",
        type: "bar",
        barWidth: 14,
        data: props.days.map((day) => day.humidity ?? 0)
      }
    ]
  };
});

function renderChart() {
  if (!chartEl.value || !props.days.length) {
    return;
  }

  chart ||= echarts.init(chartEl.value);
  chart.setOption(options.value, true);
}

function resizeChart() {
  chart?.resize();
}

onMounted(async () => {
  await nextTick();
  renderChart();
  window.addEventListener("resize", resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart);
  chart?.dispose();
  chart = null;
});

watch([() => props.days, options], async () => {
  await nextTick();
  renderChart();
}, { deep: true });
</script>

<template>
  <div v-if="days.length" ref="chartEl" class="weather-chart" aria-label="未来天气趋势图"></div>
  <div v-else class="chart-empty">暂无趋势数据</div>
</template>

