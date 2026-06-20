export type UnitMode = "metric" | "imperial";

export type ThemeMode = "light" | "dark";

export interface ApiMeta {
  cached: boolean;
  provider: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface City {
  id: string;
  name: string;
  localName?: string;
  country?: string;
  addedAt: string;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  localName?: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  lat?: number;
  lon?: number;
}

export interface CurrentWeather {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection?: number;
  windDirectionText?: string;
  windScale?: string;
  pressure?: number;
  visibility?: number;
  precipitation?: number;
  cloud?: number | null;
  icon: string;
  observedAt: string;
}

export interface ForecastDay {
  date: string;
  weekday: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  windDirectionText?: string;
  windScale?: string;
  pop?: number | null;
  pressure?: number;
  visibility?: number;
  cloud?: number | null;
  uvIndex?: number | null;
  sunrise?: string;
  sunset?: string;
  icon: string;
}

export interface Forecast {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  daily: ForecastDay[];
}

export interface WeatherSummary {
  current: CurrentWeather;
  forecast: Forecast;
}

export interface WeatherIndex {
  date: string;
  type: string;
  name: string;
  level?: string;
  category: string;
  text: string;
}

export interface WeatherIndices {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  indices: WeatherIndex[];
}

export interface HourlyWeatherItem {
  time: string;
  temperature: number | null;
  icon: string;
  condition: string;
  windDirection?: number | null;
  windDirectionText?: string;
  windScale?: string;
  windSpeed?: number | null;
  humidity?: number | null;
  pop?: number | null;
  precipitation?: number | null;
  pressure?: number | null;
  cloud?: number | null;
}

export interface HourlyForecast {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  hours: string;
  updatedAt?: string;
  hourly: HourlyWeatherItem[];
}

export interface MinutelyPrecipitationItem {
  time: string;
  precipitation: number | null;
  type: string;
}

export interface MinutelyPrecipitation {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  updatedAt?: string;
  summary: string;
  minutely: MinutelyPrecipitationItem[];
}

export interface WeatherWarning {
  id: string;
  title?: string;
  sender?: string;
  type?: string;
  typeName?: string;
  level?: string;
  severity?: string;
  severityColor?: string;
  status?: string;
  text?: string;
  instruction?: string;
  startTime?: string;
  endTime?: string;
  publishedAt?: string;
}

export interface WeatherWarnings {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  updatedAt?: string;
  warnings: WeatherWarning[];
}

export interface AirPollutant {
  code: string;
  name?: string;
  fullName?: string;
  concentration: number | null;
  unit: string;
  subIndex?: number | null;
}

export interface AirQuality {
  city: string;
  country?: string;
  adm1?: string;
  adm2?: string;
  locationId?: string;
  updatedAt?: string;
  aqi: number | null;
  category: string;
  level?: string;
  color?: string;
  primaryPollutant?: string;
  health: {
    effect?: string;
    advice: {
      general?: string;
      sensitive?: string;
    };
  };
  pollutants: AirPollutant[];
}
