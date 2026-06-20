const CODE_MESSAGES = {
  "400": { status: 400, code: "BAD_REQUEST", message: "天气请求参数格式不正确" },
  "401": { status: 502, code: "WEATHER_PROVIDER_ERROR", message: "天气服务认证失败，请检查 API Key" },
  "402": { status: 402, code: "WEATHER_PROVIDER_ERROR", message: "天气服务额度不足" },
  "403": { status: 502, code: "WEATHER_PROVIDER_ERROR", message: "天气服务暂时拒绝访问" },
  "404": { status: 404, code: "CITY_NOT_FOUND", message: "未找到该城市，请检查拼写或更换城市名" },
  "429": { status: 429, code: "RATE_LIMITED", message: "天气服务请求过于频繁，请稍后再试" },
  "204": { status: 404, code: "WEATHER_DATA_EMPTY", message: "该城市暂无对应天气数据" },
  "500": { status: 502, code: "WEATHER_PROVIDER_ERROR", message: "天气服务商内部异常" }
};

export class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function assertConfig({ apiKey, apiHost }) {
  if (!apiKey) {
    throw new AppError(500, "WEATHER_KEY_MISSING", "后端未配置天气 API Key");
  }

  if (!apiHost) {
    throw new AppError(500, "WEATHER_HOST_MISSING", "后端未配置和风天气 API Host");
  }
}

function normalizeUnit(unit) {
  return unit === "imperial" ? "i" : "m";
}

function normalizeHours(hours) {
  return ["24h", "72h", "168h"].includes(hours) ? hours : "24h";
}

function toNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function coordinate(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new AppError(502, "WEATHER_PROVIDER_ERROR", "天气服务返回的城市坐标异常");
  }

  return number.toFixed(2);
}

function coordinateQuery(location) {
  return `${coordinate(location.lon)},${coordinate(location.lat)}`;
}

function coordinatePath(location) {
  return {
    lat: coordinate(location.lat),
    lon: coordinate(location.lon)
  };
}

function baseLocationPayload(location) {
  return {
    city: location.name,
    country: location.country,
    adm1: location.adm1,
    adm2: location.adm2,
    locationId: location.id
  };
}

function colorToRgba(color) {
  if (!color || typeof color !== "object") {
    return "";
  }

  const red = toNumber(color.red, 0);
  const green = toNumber(color.green, 0);
  const blue = toNumber(color.blue, 0);
  const alpha = toNumber(color.alpha, 1);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function handleProviderCode(code, options = {}) {
  if (code === "200") {
    return;
  }

  if (code === "204" && options.allowNoContent) {
    return;
  }

  const mapped = CODE_MESSAGES[code] || {
    status: 502,
    code: "WEATHER_PROVIDER_ERROR",
    message: "天气服务暂时不可用"
  };

  throw new AppError(mapped.status, mapped.code, mapped.message);
}

function normalizeApiHost(apiHost) {
  return String(apiHost || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/g, "");
}

function buildUrl(apiHost, pathname, params) {
  const host = normalizeApiHost(apiHost);
  const url = new URL(`https://${host}${pathname}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function requestJson(url, apiKey, timeoutMs = 9000, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "X-QW-Api-Key": apiKey
      }
    });
    const data = await response.json().catch(() => null);

    if (response.status === 204 && options.allowNoContent) {
      return { code: "204" };
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError(429, "RATE_LIMITED", "天气服务请求过于频繁，请稍后再试");
      }

      throw new AppError(response.status, "WEATHER_PROVIDER_ERROR", "天气服务暂时不可用");
    }

    if (!data || typeof data !== "object") {
      throw new AppError(502, "WEATHER_PROVIDER_ERROR", "天气服务返回格式异常");
    }

    if (typeof data.code !== "string") {
      if (options.allowMissingCode) {
        return data;
      }

      throw new AppError(502, "WEATHER_PROVIDER_ERROR", "天气服务返回格式异常");
    }

    handleProviderCode(data.code, options);
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new AppError(503, "NETWORK_ERROR", "天气服务响应超时，请稍后重试");
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(503, "NETWORK_ERROR", "网络连接异常，请检查网络后重试");
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchLocations({ apiKey, query, limit = 5, lang = "zh" }) {
  const apiHost = arguments[0].apiHost;
  assertConfig({ apiKey, apiHost });

  const url = buildUrl(apiHost, "/geo/v2/city/lookup", {
    location: query,
    number: String(Math.min(Math.max(Number(limit) || 5, 1), 10)),
    lang
  });

  const data = await requestJson(url, apiKey);
  const locations = Array.isArray(data.location) ? data.location : [];

  if (locations.length === 0) {
    throw new AppError(404, "CITY_NOT_FOUND", "未找到该城市，请检查拼写或更换城市名");
  }

  return locations.map((item) => ({
    id: item.id,
    name: item.name,
    localName: item.name,
    country: item.country,
    adm1: item.adm1,
    adm2: item.adm2,
    lat: Number(item.lat),
    lon: Number(item.lon)
  }));
}

export async function resolveLocation({ apiKey, apiHost, city, lang = "zh" }) {
  const locations = await searchLocations({ apiKey, apiHost, query: city, limit: 1, lang });
  return locations[0];
}

export async function getCurrentWeather({ apiKey, apiHost, city, unit = "metric", lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const url = buildUrl(apiHost, "/v7/weather/now", {
    location: location.id,
    lang,
    unit: normalizeUnit(unit)
  });

  const data = await requestJson(url, apiKey);
  const now = data.now;

  return {
    city: location.name,
    country: location.country,
    adm1: location.adm1,
    adm2: location.adm2,
    locationId: location.id,
    temperature: Number(now.temp),
    feelsLike: Number(now.feelsLike),
    condition: now.text,
    description: now.text,
    humidity: Number(now.humidity),
    windSpeed: Number(now.windSpeed),
    windDirection: Number(now.wind360),
    windDirectionText: now.windDir,
    windScale: now.windScale,
    pressure: Number(now.pressure),
    visibility: Number(now.vis),
    precipitation: Number(now.precip),
    cloud: now.cloud === undefined ? null : Number(now.cloud),
    icon: now.icon,
    observedAt: data.updateTime
  };
}

export async function getForecast({ apiKey, apiHost, city, unit = "metric", lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const url = buildUrl(apiHost, "/v7/weather/7d", {
    location: location.id,
    lang,
    unit: normalizeUnit(unit)
  });

  const data = await requestJson(url, apiKey);
  const daily = Array.isArray(data.daily) ? data.daily.slice(0, 5) : [];

  return {
    ...baseLocationPayload(location),
    daily: daily.map((item) => ({
      date: item.fxDate,
      weekday: new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(item.fxDate)),
      tempMax: Number(item.tempMax),
      tempMin: Number(item.tempMin),
      condition: item.textDay,
      description: item.textDay === item.textNight ? item.textDay : `${item.textDay}转${item.textNight}`,
      humidity: Number(item.humidity),
      windSpeed: Number(item.windSpeedDay),
      windDirection: Number(item.wind360Day),
      windDirectionText: item.windDirDay,
      windScale: item.windScaleDay,
      pop: item.precip === undefined ? null : Number(item.precip),
      pressure: Number(item.pressure),
      visibility: Number(item.vis),
      cloud: item.cloud === undefined ? null : Number(item.cloud),
      uvIndex: item.uvIndex === undefined ? null : Number(item.uvIndex),
      sunrise: item.sunrise,
      sunset: item.sunset,
      icon: item.iconDay
    }))
  };
}

export async function getWeatherIndices({ apiKey, apiHost, city, types = "1,2,3,5,8,9", lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const url = buildUrl(apiHost, "/v7/indices/1d", {
    location: location.id,
    lang,
    type: types
  });

  const data = await requestJson(url, apiKey);
  const daily = Array.isArray(data.daily) ? data.daily : [];

  return {
    ...baseLocationPayload(location),
    indices: daily.map((item) => ({
      date: item.date,
      type: String(item.type),
      name: item.name,
      level: item.level,
      category: item.category,
      text: item.text
    }))
  };
}

export async function getHourlyForecast({ apiKey, apiHost, city, unit = "metric", hours = "24h", lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const selectedHours = normalizeHours(hours);
  const url = buildUrl(apiHost, `/v7/weather/${selectedHours}`, {
    location: location.id,
    lang,
    unit: normalizeUnit(unit)
  });

  const data = await requestJson(url, apiKey);
  const hourly = Array.isArray(data.hourly) ? data.hourly : [];

  return {
    ...baseLocationPayload(location),
    hours: selectedHours,
    updatedAt: data.updateTime,
    hourly: hourly.map((item) => ({
      time: item.fxTime,
      temperature: toNumber(item.temp),
      icon: item.icon,
      condition: item.text,
      windDirection: toNumber(item.wind360),
      windDirectionText: item.windDir,
      windScale: item.windScale,
      windSpeed: toNumber(item.windSpeed),
      humidity: toNumber(item.humidity),
      pop: toNumber(item.pop),
      precipitation: toNumber(item.precip),
      pressure: toNumber(item.pressure),
      cloud: toNumber(item.cloud)
    }))
  };
}

export async function getMinutelyPrecipitation({ apiKey, apiHost, city, lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const url = buildUrl(apiHost, "/v7/minutely/5m", {
    location: coordinateQuery(location),
    lang
  });

  const data = await requestJson(url, apiKey, 9000, { allowNoContent: true });
  const minutely = Array.isArray(data.minutely) ? data.minutely : [];

  return {
    ...baseLocationPayload(location),
    updatedAt: data.updateTime || "",
    summary: data.summary || (minutely.length ? "" : "该城市暂无分钟级降水数据"),
    minutely: minutely.map((item) => ({
      time: item.fxTime,
      precipitation: toNumber(item.precip),
      type: item.type || "rain"
    }))
  };
}

export async function getWeatherWarnings({ apiKey, apiHost, city, lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const legacyUrl = buildUrl(apiHost, "/v7/warning/now", {
    location: location.id,
    lang
  });

  try {
    const data = await requestJson(legacyUrl, apiKey, 9000, { allowNoContent: true });
    const warnings = Array.isArray(data.warning) ? data.warning : [];

    return {
      ...baseLocationPayload(location),
      updatedAt: data.updateTime || "",
      warnings: warnings.map((item) => ({
        id: item.id || `${item.sender || location.id}-${item.pubTime || item.startTime || item.title}`,
        title: item.title,
        sender: item.sender,
        type: item.type,
        typeName: item.typeName,
        level: item.level,
        severity: item.severity || item.level,
        severityColor: item.severityColor || "",
        status: item.status || "active",
        text: item.text,
        startTime: item.startTime,
        endTime: item.endTime,
        publishedAt: item.pubTime || item.startTime
      }))
    };
  } catch (error) {
    if (!(error instanceof AppError) || ![403, 404, 502].includes(error.status)) {
      throw error;
    }
  }

  const { lat, lon } = coordinatePath(location);
  const alertUrl = buildUrl(apiHost, `/weatheralert/v1/current/${lat}/${lon}`, { lang, localTime: "true" });
  const data = await requestJson(alertUrl, apiKey, 9000, { allowMissingCode: true });
  const warnings = Array.isArray(data.alerts) ? data.alerts : [];

  return {
    ...baseLocationPayload(location),
    updatedAt: data.metadata?.tag || "",
    warnings: warnings.map((item) => ({
      id: item.id || `${item.sender || location.id}-${item.issueTime || item.title}`,
      title: item.headline || item.title,
      sender: item.senderName || item.sender,
      type: item.eventType?.code || item.type,
      typeName: item.eventType?.name || item.typeName || item.type,
      level: item.level,
      severity: item.severity,
      severityColor: item.color?.code || colorToRgba(item.color),
      status: item.messageType?.code || item.status || "active",
      text: item.description || item.text || "",
      instruction: item.instruction || "",
      startTime: item.effectiveTime || item.onsetTime || item.startTime,
      endTime: item.expireTime || item.endTime,
      publishedAt: item.issuedTime || item.issueTime || item.startTime
    }))
  };
}

export async function getAirQuality({ apiKey, apiHost, city, lang = "zh" }) {
  assertConfig({ apiKey, apiHost });

  const location = await resolveLocation({ apiKey, apiHost, city, lang });
  const { lat, lon } = coordinatePath(location);
  const url = buildUrl(apiHost, `/airquality/v1/current/${lat}/${lon}`, { lang });
  const data = await requestJson(url, apiKey, 9000, { allowMissingCode: true });
  const index = data.indexes?.find((item) => item.code === "us-epa") || data.indexes?.[0] || null;
  const pollutants = Array.isArray(data.pollutants) ? data.pollutants : [];
  const health = index?.health || data.health || {};

  return {
    ...baseLocationPayload(location),
    updatedAt: data.metadata?.tag || data.updateTime || "",
    aqi: index ? toNumber(index.aqi) : null,
    category: index?.category || "",
    level: index?.level || "",
    color: colorToRgba(index?.color),
    primaryPollutant: index?.primaryPollutant?.name || index?.primaryPollutant?.code || "",
    health: {
      effect: health.effect || "",
      advice: {
        general: health.advice?.generalPopulation || "",
        sensitive: health.advice?.sensitivePopulation || ""
      }
    },
    pollutants: pollutants.map((item) => ({
      code: item.code,
      name: item.name,
      fullName: item.fullName,
      concentration: toNumber(item.concentration?.value),
      unit: item.concentration?.unit || item.unit || "",
      subIndex: toNumber(item.subIndexes?.[0]?.aqi)
    }))
  };
}
