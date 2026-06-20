<template>
  <section class="skeleton-stack" aria-label="天气数据加载中">
    <div class="skeleton-hero">
      <span class="skeleton-line short"></span>
      <span class="skeleton-title"></span>
      <span class="skeleton-line medium"></span>
      <span class="skeleton-temp"></span>
      <div class="skeleton-actions">
        <span></span>
        <span></span>
      </div>
    </div>

    <div class="skeleton-metrics">
      <span v-for="item in 6" :key="item"></span>
    </div>

    <div class="skeleton-forecast">
      <span v-for="item in 5" :key="item"></span>
    </div>
  </section>
</template>
