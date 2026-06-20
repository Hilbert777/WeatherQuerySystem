import type {
  AirQuality,
  ApiErrorResponse,
  ApiResponse,
  Forecast,
  HourlyForecast,
  LocationSuggestion,
  MinutelyPrecipitation,
  UnitMode,
  WeatherWarnings,
  WeatherIndices,
  WeatherSummary
} from "@/types/weather";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export class ClientApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function readResponse<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | ApiErrorResponse | null;

  if (!payload) {
    throw new ClientApiError(response.status, "NETWORK_ERROR", "服务响应格式异常");
  }

  if (!response.ok || payload.success === false) {
    const error = payload as ApiErrorResponse;
    throw new ClientApiError(
      response.status,
      error.error?.code || "NETWORK_ERROR",
      error.error?.message || "天气服务暂时不可用"
    );
  }

  return payload as ApiResponse<T>;
}

async function readJson<T>(url: string, options?: RequestInit): Promise<T> {
  return (await readResponse<T>(url, options)).data;
}

function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  return search.toString();
}

export function searchLocations(query: string, limit = 5, lang = "zh") {
  return readJson<LocationSuggestion[]>(
    `${API_BASE}/geo/search?${queryString({ q: query, limit, lang })}`
  );
}

export function getWeatherSummary(city: string, unit: UnitMode) {
  return readJson<WeatherSummary>(
    `${API_BASE}/weather/summary?${queryString({ city, unit, lang: "zh" })}`
  );
}

export function getWeatherSummaryResponse(city: string, unit: UnitMode) {
  return readResponse<WeatherSummary>(
    `${API_BASE}/weather/summary?${queryString({ city, unit, lang: "zh" })}`
  );
}

export function getForecast(city: string, unit: UnitMode) {
  return readJson<Forecast>(
    `${API_BASE}/weather/forecast?${queryString({ city, unit, lang: "zh" })}`
  );
}

export function getWeatherIndices(city: string, types = "1,2,3,5,8,9") {
  return readJson<WeatherIndices>(
    `${API_BASE}/weather/indices?${queryString({ city, types, lang: "zh" })}`
  );
}

export function getHourlyForecast(city: string, unit: UnitMode, hours = "24h") {
  return readJson<HourlyForecast>(
    `${API_BASE}/weather/hourly?${queryString({ city, unit, hours, lang: "zh" })}`
  );
}

export function getMinutelyPrecipitation(city: string) {
  return readJson<MinutelyPrecipitation>(
    `${API_BASE}/weather/minutely?${queryString({ city, lang: "zh" })}`
  );
}

export function getWeatherWarnings(city: string) {
  return readJson<WeatherWarnings>(
    `${API_BASE}/weather/warnings?${queryString({ city, lang: "zh" })}`
  );
}

export function getAirQuality(city: string) {
  return readJson<AirQuality>(
    `${API_BASE}/weather/air?${queryString({ city, lang: "zh" })}`
  );
}

export function getCitiesFromServer() {
  return readJson<{ cities: string[] }>(`${API_BASE}/cities`);
}
