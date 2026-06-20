<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  error: {
    code: string;
    message: string;
  } | null;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const errorMeta = computed(() => {
  const code = props.error?.code || "NOTICE";

  if (code === "CITY_NOT_FOUND") {
    return {
      icon: "?",
      title: "城市没有匹配结果",
      action: "换个城市"
    };
  }

  if (code === "RATE_LIMITED") {
    return {
      icon: "↯",
      title: "请求过于频繁",
      action: "稍后重试"
    };
  }

  if (code === "NETWORK_ERROR") {
    return {
      icon: "⇄",
      title: "网络连接异常",
      action: "重新连接"
    };
  }

  if (code === "WEATHER_KEY_MISSING" || code === "WEATHER_HOST_MISSING") {
    return {
      icon: "!",
      title: "后端配置不完整",
      action: "重新检查"
    };
  }

  if (code === "NOTICE") {
    return {
      icon: "✓",
      title: "操作提示",
      action: "知道了"
    };
  }

  return {
    icon: "!",
    title: "天气服务暂时不可用",
    action: "重试"
  };
});
</script>

<template>
  <div v-if="error" class="error-notice" :class="`error-${error.code.toLowerCase()}`" role="alert">
    <span>{{ errorMeta.icon }}</span>
    <div>
      <strong>{{ errorMeta.title }}</strong>
      <p>{{ error.message }}</p>
    </div>
    <button type="button" @click="emit('retry')">重试</button>
  </div>
</template>
