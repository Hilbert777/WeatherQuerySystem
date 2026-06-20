<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useWeatherStore } from "@/stores/weatherStore";
import type { MapCity } from "@/data/mapCities";
import { formatTemperature, weatherIcon } from "@/utils/weather";

const props = withDefaults(defineProps<{
  mode?: "weather" | "warning";
  title?: string;
  subtitle?: string;
  cities?: MapCity[];
  dense?: boolean;
  showDetail?: boolean;
}>(), {
  mode: "weather",
  title: "中国天气地图",
  dense: false,
  showDetail: true
});

const emit = defineEmits<{
  select: [city: string];
}>();

type GeoPosition = [number, number, ...number[]];
type GeoRing = GeoPosition[];
type GeoPolygon = GeoRing[];
type GeoMultiPolygon = GeoPolygon[];
type GeoGeometry =
  | { type: "Polygon"; coordinates: GeoPolygon }
  | { type: "MultiPolygon"; coordinates: GeoMultiPolygon };
type GeoFeature = {
  type: "Feature";
  properties?: {
    adcode?: string | number;
    name?: string;
  };
  geometry: GeoGeometry | null;
};
type GeoFeatureCollection = { type: "FeatureCollection"; features: GeoFeature[] };
type MapShape = { id: string; name: string; d: string };

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 680;
const MAP_PADDING = 34;
const MIN_SCALE = 1;
const MAX_SCALE = 9.5;
const REGIONAL_SCALE = 1.55;
const DETAIL_SCALE = 3.05;
const PREFECTURE_BOUNDARY_SCALE = 5;
const DRAG_SENSITIVITY = 1.28;
const MIN_VISIBLE_MAP_RATIO = 0.48;
const PREFETCH_BATCH_SIZE = 4;

const FEATURED_CITY_NAMES = new Set([
  "北京市", "天津市", "上海市", "重庆市",
  "石家庄市", "太原市", "呼和浩特市", "沈阳市", "长春市", "哈尔滨市",
  "南京市", "杭州市", "合肥市", "福州市", "南昌市", "济南市", "郑州市",
  "武汉市", "长沙市", "广州市", "南宁市", "海口市", "成都市", "贵阳市",
  "昆明市", "拉萨市", "西安市", "兰州市", "西宁市", "银川市", "乌鲁木齐市",
  "台湾省", "香港特别行政区", "澳门特别行政区",
  "深圳市", "青岛市", "大连市", "宁波市", "厦门市", "苏州市", "无锡市",
  "佛山市", "东莞市", "珠海市", "三亚市"
]);

const REGIONAL_CITY_NAMES = new Set([
  ...FEATURED_CITY_NAMES,
  "唐山市", "秦皇岛市", "保定市", "邯郸市", "大同市", "包头市", "鄂尔多斯市",
  "鞍山市", "丹东市", "吉林市", "齐齐哈尔市", "大庆市", "徐州市", "常州市",
  "南通市", "温州市", "嘉兴市", "金华市", "芜湖市", "泉州市", "赣州市",
  "烟台市", "潍坊市", "临沂市", "洛阳市", "宜昌市", "襄阳市", "株洲市",
  "衡阳市", "汕头市", "惠州市", "中山市", "湛江市", "桂林市", "柳州市",
  "绵阳市", "遵义市", "曲靖市", "日喀则市", "宝鸡市", "天水市", "海东市",
  "石嘴山市", "克拉玛依市", "喀什地区", "伊犁哈萨克自治州"
]);

const weather = useWeatherStore();
const preferences = usePreferenceStore();
const selectedCity = ref("");
const chinaCities = ref<MapCity[]>([]);
const provincePaths = ref<MapShape[]>([]);
const prefecturePaths = ref<MapShape[]>([]);
const mapElement = ref<HTMLElement | null>(null);
const viewport = reactive({ x: 0, y: 0, scale: 1 });
const projection = reactive({
  minLon: 73,
  maxLon: 135,
  minLat: 17,
  maxLat: 54,
  scale: 14,
  offsetX: 0,
  offsetY: 0
});
const dragging = ref(false);
const dragStart = reactive({ x: 0, y: 0, mapX: 0, mapY: 0 });
const mapStatus = ref<"loading" | "ready" | "error">("loading");
const prefectureStatus = ref<"idle" | "loading" | "ready" | "error">("idle");
const mapMetrics = reactive({ width: MAP_WIDTH, height: MAP_HEIGHT, ratio: 1, offsetX: 0, offsetY: 0 });
const prefetchedKeys = new Set<string>();
let resizeObserver: ResizeObserver | null = null;
let prefetchTimer: number | undefined;
let prefetchRunId = 0;
let prefectureLoadPromise: Promise<void> | null = null;

const activeCities = computed(() => {
  if (props.cities?.length) {
    return props.cities;
  }

  return chinaCities.value;
});

const markerLayerStyle = computed(() => ({
  transform: "none"
}));

const mapTransform = computed(() => `translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`);

const showPrefectureBoundaries = computed(() => (
  viewport.scale > PREFECTURE_BOUNDARY_SCALE && prefecturePaths.value.length > 0
));

const markerScreenScale = computed(() => {
  if (viewport.scale < REGIONAL_SCALE) {
    return 1.06;
  }

  if (viewport.scale < DETAIL_SCALE) {
    return 0.98;
  }

  return Math.min(1.16, 0.9 + Math.log2(viewport.scale / DETAIL_SCALE + 1) * 0.2);
});

const mapPoints = computed(() => activeCities.value.map((city, sourceIndex) => {
  const point = projectPoint([city.lon, city.lat]);
  const summary = weather.getSummary(city.name, preferences.unit);
  const warnings = weather.getWarnings(city.name);

  return {
    ...city,
    x: point.x,
    y: point.y,
    summary,
    warnings,
    featured: isFeaturedCity(city),
    regional: isRegionalCity(city),
    sourceIndex
  };
}));

type MapPoint = typeof mapPoints.value[number];

const tierMapPoints = computed(() => {
  if (viewport.scale >= DETAIL_SCALE) {
    return mapPoints.value;
  }

  if (viewport.scale >= REGIONAL_SCALE) {
    return mapPoints.value.filter((city) => city.regional);
  }

  return mapPoints.value.filter((city) => city.featured);
});

const visibleMapPoints = computed(() => resolveMarkerCollisions(tierMapPoints.value));

const prefetchMapPoints = computed(() => visibleMapPoints.value.filter((city) => {
  const screen = screenPoint(city);
  const margin = 120;

  return screen.x >= -margin
    && screen.x <= mapMetrics.width + margin
    && screen.y >= -margin
    && screen.y <= mapMetrics.height + margin;
}));

const selectedPoint = computed(() => {
  if (!selectedCity.value) {
    return null;
  }

  return mapPoints.value.find((city) => city.name === selectedCity.value) || null;
});

const selectedSummary = computed(() => selectedPoint.value?.summary || null);
const selectedWarnings = computed(() => selectedPoint.value?.warnings?.warnings || []);

function pointFromClient(clientX: number, clientY: number) {
  const element = mapElement.value;

  if (!element) {
    return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  }

  const rect = element.getBoundingClientRect();
  const renderScale = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT);
  const renderedWidth = MAP_WIDTH * renderScale;
  const renderedHeight = MAP_HEIGHT * renderScale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  const x = (clientX - rect.left - offsetX) / renderScale;
  const y = (clientY - rect.top - offsetY) / renderScale;

  return {
    x: Math.min(MAP_WIDTH, Math.max(0, x)),
    y: Math.min(MAP_HEIGHT, Math.max(0, y))
  };
}

function collectPositions(geometry: GeoGeometry | null) {
  const positions: GeoPosition[] = [];

  if (!geometry) {
    return positions;
  }

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => positions.push(...ring));
    return positions;
  }

  geometry.coordinates.forEach((polygon) => {
    polygon.forEach((ring) => positions.push(...ring));
  });

  return positions;
}

function syncProjection(features: GeoFeature[]) {
  const positions = features.flatMap((feature) => collectPositions(feature.geometry));
  const lons = positions.map(([lon]) => lon);
  const lats = positions.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lonSpan = maxLon - minLon || 1;
  const latSpan = maxLat - minLat || 1;
  const scale = Math.min((MAP_WIDTH - MAP_PADDING * 2) / lonSpan, (MAP_HEIGHT - MAP_PADDING * 2) / latSpan);

  projection.minLon = minLon;
  projection.maxLon = maxLon;
  projection.minLat = minLat;
  projection.maxLat = maxLat;
  projection.scale = scale;
  projection.offsetX = (MAP_WIDTH - lonSpan * scale) / 2;
  projection.offsetY = (MAP_HEIGHT - latSpan * scale) / 2;
}

function projectPoint(position: GeoPosition) {
  const [lon, lat] = position;

  return {
    x: (lon - projection.minLon) * projection.scale + projection.offsetX,
    y: (projection.maxLat - lat) * projection.scale + projection.offsetY
  };
}

function normalizeCityName(name: string) {
  return name.trim();
}

function isFeaturedCity(city: MapCity) {
  return city.level === "province-city" || FEATURED_CITY_NAMES.has(normalizeCityName(city.name));
}

function isRegionalCity(city: MapCity) {
  return isFeaturedCity(city) || REGIONAL_CITY_NAMES.has(normalizeCityName(city.name));
}

function screenPoint(city: { x: number; y: number }) {
  return {
    x: mapMetrics.offsetX + (city.x * viewport.scale + viewport.x) * mapMetrics.ratio,
    y: mapMetrics.offsetY + (city.y * viewport.scale + viewport.y) * mapMetrics.ratio
  };
}

function markerPriority(city: MapPoint) {
  if (city.name === selectedCity.value) {
    return 4;
  }

  if (city.featured) {
    return 3;
  }

  if (city.regional) {
    return 2;
  }

  return 1;
}

function collisionDistance() {
  if (viewport.scale >= 6) {
    return 12;
  }

  if (viewport.scale >= DETAIL_SCALE) {
    return 16;
  }

  if (viewport.scale >= REGIONAL_SCALE) {
    return 24;
  }

  return 32;
}

function resolveMarkerCollisions(points: MapPoint[]) {
  const sorted = [...points].sort((a, b) => markerPriority(b) - markerPriority(a));
  const accepted: Array<{ x: number; y: number; priority: number }> = [];
  const minDistance = collisionDistance();
  const minDistanceSquared = minDistance * minDistance;
  const visible: MapPoint[] = [];

  sorted.forEach((city) => {
    const screen = screenPoint(city);
    const priority = markerPriority(city);
    const overlapped = accepted.some((point) => {
      if (priority > point.priority) {
        return false;
      }

      const dx = screen.x - point.x;
      const dy = screen.y - point.y;
      return dx * dx + dy * dy < minDistanceSquared;
    });

    if (!overlapped) {
      accepted.push({ x: screen.x, y: screen.y, priority });
      visible.push(city);
    }
  });

  return visible.sort((a, b) => a.sourceIndex - b.sourceIndex);
}

function ringToPath(ring: GeoRing) {
  if (!ring.length) {
    return "";
  }

  const commands = ring.map((position, index) => {
    const point = projectPoint(position);
    const command = index === 0 ? "M" : "L";

    return `${command}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  });

  return `${commands.join(" ")} Z`;
}

function polygonToPath(polygon: GeoPolygon) {
  return polygon.map(ringToPath).filter(Boolean).join(" ");
}

function geometryToPath(geometry: GeoGeometry | null) {
  if (!geometry) {
    return "";
  }

  if (geometry.type === "Polygon") {
    return polygonToPath(geometry.coordinates);
  }

  return geometry.coordinates.map(polygonToPath).filter(Boolean).join(" ");
}

async function loadChinaMap() {
  mapStatus.value = "loading";
  prefecturePaths.value = [];
  prefectureStatus.value = "idle";

  try {
    const [geoResponse, citiesResponse] = await Promise.all([
      fetch("/data/china-provinces.geo.json"),
      fetch("/data/china-prefecture-cities.json")
    ]);

    if (!geoResponse.ok || !citiesResponse.ok) {
      throw new Error("China map data request failed");
    }

    const geoData = await geoResponse.json() as GeoFeatureCollection;
    const cityData = await citiesResponse.json() as MapCity[];
    const features = geoData.features.filter((feature) => feature.geometry);

    syncProjection(features);
    provincePaths.value = features.map((feature, index) => ({
      id: String(feature.properties?.adcode || index),
      name: feature.properties?.name || "",
      d: geometryToPath(feature.geometry)
    })).filter((shape) => Boolean(shape.d));
    chinaCities.value = cityData;
    mapStatus.value = "ready";
  } catch {
    provincePaths.value = [];
    prefecturePaths.value = [];
    chinaCities.value = [];
    mapStatus.value = "error";
  }
}

async function ensurePrefectureBoundaries() {
  if (mapStatus.value !== "ready" || prefectureStatus.value === "ready") {
    return;
  }

  if (prefectureLoadPromise) {
    return prefectureLoadPromise;
  }

  prefectureStatus.value = "loading";
  prefectureLoadPromise = fetch("/data/china-prefecture-boundaries.geo.json")
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("China prefecture boundary request failed");
      }

      const data = await response.json() as GeoFeatureCollection;
      prefecturePaths.value = data.features
        .filter((feature) => feature.geometry)
        .map((feature, index) => ({
          id: String(feature.properties?.adcode || index),
          name: feature.properties?.name || "",
          d: geometryToPath(feature.geometry)
        }))
        .filter((shape) => Boolean(shape.d));
      prefectureStatus.value = "ready";
    })
    .catch(() => {
      prefecturePaths.value = [];
      prefectureStatus.value = "error";
    })
    .finally(() => {
      prefectureLoadPromise = null;
    });

  return prefectureLoadPromise;
}

function markerTone(city: MapPoint) {
  if (props.mode === "warning") {
    if (!city.warnings) {
      return "muted";
    }

    return city.warnings.warnings.length ? "danger" : "safe";
  }

  const temp = city.summary?.current.temperature;

  if (temp === undefined) {
    return "muted";
  }

  if (temp >= 32) {
    return "hot";
  }

  if (temp <= 5) {
    return "cold";
  }

  return "mild";
}

function markerIcon(city: MapPoint) {
  if (props.mode === "warning") {
    if (city.warnings?.warnings.length) {
      return "!";
    }

    return city.warnings ? "✓" : "!";
  }

  return city.summary ? weatherIcon(city.summary.current.icon) : "•";
}

function markerStyle(city: MapPoint) {
  const point = screenPoint(city);

  return {
    left: `${point.x}px`,
    top: `${point.y}px`,
    "--marker-scale": markerScreenScale.value
  };
}

function loadCity(city: string) {
  weather.fetchSummary(city).catch(() => undefined);
  weather.fetchWarnings(city).catch(() => undefined);
}

function prefetchKey(city: string) {
  return `${props.mode}:${preferences.unit}:${city.trim().toLowerCase()}`;
}

async function prefetchOne(city: string) {
  if (props.mode === "warning") {
    await weather.fetchWarnings(city);
    return;
  }

  await weather.fetchSummary(city);
}

async function runVisiblePrefetch(runId: number) {
  const targets = prefetchMapPoints.value
    .map((city) => city.name)
    .filter((city) => !prefetchedKeys.has(prefetchKey(city)));

  for (let index = 0; index < targets.length; index += PREFETCH_BATCH_SIZE) {
    if (runId !== prefetchRunId) {
      return;
    }

    const batch = targets.slice(index, index + PREFETCH_BATCH_SIZE);
    await Promise.allSettled(batch.map((city) => {
      const key = prefetchKey(city);

      if (prefetchedKeys.has(key)) {
        return Promise.resolve();
      }

      prefetchedKeys.add(key);
      return prefetchOne(city);
    }));
  }
}

function scheduleVisiblePrefetch() {
  window.clearTimeout(prefetchTimer);

  if (mapStatus.value !== "ready") {
    return;
  }

  const runId = ++prefetchRunId;
  prefetchTimer = window.setTimeout(() => {
    runVisiblePrefetch(runId).catch(() => undefined);
  }, 180);
}

function selectCity(city: string) {
  selectedCity.value = city;
  loadCity(city);
  emit("select", city);
}

function clampViewport() {
  const scaledWidth = MAP_WIDTH * viewport.scale;
  const scaledHeight = MAP_HEIGHT * viewport.scale;
  const minVisibleWidth = MAP_WIDTH * MIN_VISIBLE_MAP_RATIO;
  const minVisibleHeight = MAP_HEIGHT * MIN_VISIBLE_MAP_RATIO;
  const minX = MAP_WIDTH - scaledWidth - minVisibleWidth;
  const maxX = MAP_WIDTH - minVisibleWidth;
  const minY = MAP_HEIGHT - scaledHeight - minVisibleHeight;
  const maxY = MAP_HEIGHT - minVisibleHeight;

  viewport.x = Math.min(maxX, Math.max(minX, viewport.x));
  viewport.y = Math.min(maxY, Math.max(minY, viewport.y));
}

function zoomTo(nextScale: number, origin = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }) {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
  const ratio = scale / viewport.scale;

  viewport.x = origin.x - (origin.x - viewport.x) * ratio;
  viewport.y = origin.y - (origin.y - viewport.y) * ratio;
  viewport.scale = scale;
  clampViewport();
}

function zoom(direction: 1 | -1) {
  zoomTo(viewport.scale * (direction > 0 ? 1.28 : 0.78));
}

function resetView() {
  viewport.x = 0;
  viewport.y = 0;
  viewport.scale = 1;
  clampViewport();
}

function handleWheel(event: WheelEvent) {
  const origin = pointFromClient(event.clientX, event.clientY);
  const factor = event.deltaY < 0 ? 1.18 : 0.84;

  zoomTo(viewport.scale * factor, origin);
}

function updateMapMetrics() {
  const element = mapElement.value;

  if (!element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  const ratio = Math.min(rect.width / MAP_WIDTH, rect.height / MAP_HEIGHT) || 1;
  const renderedWidth = MAP_WIDTH * ratio;
  const renderedHeight = MAP_HEIGHT * ratio;

  mapMetrics.width = rect.width;
  mapMetrics.height = rect.height;
  mapMetrics.ratio = ratio;
  mapMetrics.offsetX = (rect.width - renderedWidth) / 2;
  mapMetrics.offsetY = (rect.height - renderedHeight) / 2;
}

function startDrag(event: PointerEvent) {
  const point = pointFromClient(event.clientX, event.clientY);

  dragging.value = true;
  dragStart.x = point.x;
  dragStart.y = point.y;
  dragStart.mapX = viewport.x;
  dragStart.mapY = viewport.y;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value) {
    return;
  }

  const point = pointFromClient(event.clientX, event.clientY);
  viewport.x = dragStart.mapX + ((point.x - dragStart.x) * DRAG_SENSITIVITY) / viewport.scale;
  viewport.y = dragStart.mapY + ((point.y - dragStart.y) * DRAG_SENSITIVITY) / viewport.scale;
  clampViewport();
}

function endDrag() {
  dragging.value = false;
}

onMounted(() => {
  loadChinaMap();
  window.setTimeout(updateMapMetrics);

  if (mapElement.value && "ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(updateMapMetrics);
    resizeObserver.observe(mapElement.value);
  }
});

watch(() => preferences.unit, () => {
  prefetchedKeys.clear();

  if (selectedCity.value) {
    weather.fetchSummary(selectedCity.value, { force: true }).catch(() => undefined);
  }

  scheduleVisiblePrefetch();
});

watch(() => props.mode, () => {
  scheduleVisiblePrefetch();
});

watch(
  () => [mapStatus.value, viewport.scale],
  () => {
    if (viewport.scale > PREFECTURE_BOUNDARY_SCALE) {
      ensurePrefectureBoundaries().catch(() => undefined);
    }
  }
);

watch(
  () => [mapStatus.value, props.mode, preferences.unit, viewport.scale, viewport.x, viewport.y, prefetchMapPoints.value.map((city) => city.name).join("|")],
  scheduleVisiblePrefetch
);

onBeforeUnmount(() => {
  window.clearTimeout(prefetchTimer);
  prefetchRunId += 1;
  resizeObserver?.disconnect();
});
</script>

<template>
  <section class="panel world-map-panel china-map-panel" :class="{ compact: dense }">
    <div class="panel-head map-head">
      <div>
        <span class="eyebrow">{{ mode === "warning" ? "预警地图" : "天气地图" }}</span>
        <h2>{{ title }}</h2>
        <p>{{ subtitle }}</p>
      </div>
      <div class="map-tools">
        <span class="panel-state">{{ Math.round(viewport.scale * 100) }}%</span>
        <button class="icon-button" type="button" aria-label="放大地图" title="放大" @click="zoom(1)">+</button>
        <button class="icon-button" type="button" aria-label="缩小地图" title="缩小" @click="zoom(-1)">-</button>
        <button class="ghost-button compact" type="button" @click="resetView">复位</button>
      </div>
    </div>

    <div
      ref="mapElement"
      class="world-map"
      :class="{ dragging }"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @pointerleave="endDrag"
      @wheel.prevent="handleWheel"
    >
      <svg :viewBox="`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`" role="img" aria-label="可拖动中国天气地图">
        <g :transform="mapTransform">
          <rect class="map-ocean" x="-120" y="-90" :width="MAP_WIDTH + 240" :height="MAP_HEIGHT + 180" rx="28" />
          <path
            v-for="shape in provincePaths"
            :key="shape.id"
            class="map-land"
            :d="shape.d"
          />
          <g v-if="showPrefectureBoundaries" class="map-city-boundary-layer">
            <path
              v-for="shape in prefecturePaths"
              :key="`prefecture-${shape.id}`"
              class="map-city-boundary"
              :d="shape.d"
            />
          </g>
          <path class="map-line" :d="`M0 ${MAP_HEIGHT / 2} H${MAP_WIDTH} M${MAP_WIDTH / 2} 0 V${MAP_HEIGHT}`" />
        </g>
      </svg>

      <div v-if="mapStatus !== 'ready'" class="map-status" :class="mapStatus">
        {{ mapStatus === "loading" ? "正在加载中国行政区边界" : "中国地图数据加载失败" }}
      </div>

      <div class="map-marker-layer" :style="markerLayerStyle">
        <button
          v-for="city in visibleMapPoints"
          :key="city.adcode || city.name"
          class="map-marker"
          :class="[markerTone(city), { active: city.name === selectedCity }]"
          type="button"
          :aria-label="`${city.province || city.country} ${city.name}`"
          :title="`${city.province || city.country} · ${city.name}`"
          :style="markerStyle(city)"
          @pointerdown.stop
          @click="selectCity(city.name)"
        >
          <span>{{ markerIcon(city) }}</span>
          <strong>{{ city.name }}</strong>
        </button>
      </div>
    </div>

    <div v-if="showDetail && selectedPoint" class="map-detail">
      <div>
        <span class="eyebrow">{{ selectedPoint.province || selectedPoint.country }}</span>
        <h3>{{ selectedPoint.name }}</h3>
        <p v-if="mode === 'warning'">
          {{ selectedWarnings.length ? `${selectedWarnings.length} 条生效预警` : "当前未查询到生效预警" }}
        </p>
        <p v-else>
          {{ selectedSummary?.current.description || "天气数据加载中" }}
        </p>
      </div>
      <div class="map-detail-metrics">
        <strong v-if="selectedSummary">
          {{ formatTemperature(selectedSummary.current.temperature, preferences.unitSymbol) }}
        </strong>
        <span v-else>--</span>
        <button class="primary-button compact" type="button" @click="selectCity(selectedPoint.name)">
          查看城市
        </button>
      </div>
    </div>
  </section>
</template>
