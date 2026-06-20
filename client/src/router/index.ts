import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "@/views/DashboardView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: DashboardView
    },
    {
      path: "/city/:cityName",
      name: "city-detail",
      component: () => import("@/views/CityDetailView.vue"),
      props: true
    },
    {
      path: "/weather-map",
      name: "weather-map",
      component: () => import("@/views/WeatherMapView.vue")
    },
    {
      path: "/warning-map",
      name: "warning-map",
      component: () => import("@/views/WarningMapView.vue")
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/"
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
