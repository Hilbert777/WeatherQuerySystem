import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TimedCache } from "./services/cache.js";
import {
  AppError,
  getAirQuality,
  getCurrentWeather,
  getForecast,
  getHourlyForecast,
  getMinutelyPrecipitation,
  getWeatherIndices,
  getWeatherWarnings,
  searchLocations
} from "./services/weatherProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataFile = path.join(__dirname, "data", "cities.json");

dotenv.config({ path: path.join(rootDir, ".env") });

const app = express();
const port = Number(process.env.PORT || 3001);
const cache = new TimedCache();

app.use(cors({
  origin: [/^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/localhost:\d+$/],
  credentials: false
}));
app.use(express.json({ limit: "64kb" }));

function ok(res, data, meta = {}) {
  res.json({
    success: true,
    data,
    meta: {
      cached: false,
      provider: "qweather",
      updatedAt: new Date().toISOString(),
      ...meta
    }
  });
}

function fail(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "服务端未预期错误"
    }
  });
}

async function readApiKeyFileConfig() {
  try {
    const lines = (await fs.readFile(path.join(rootDir, "APIkey.txt"), "utf8"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const config = { apiKey: "", apiHost: "" };

    for (const line of lines) {
      const [rawKey, ...rawValue] = line.split("=");
      const value = rawValue.length ? rawValue.join("=").trim() : line;
      const key = rawValue.length ? rawKey.trim().toUpperCase() : "";

      if (key.includes("HOST") || /qweatherapi\.com|qweather\.com|api\.qweather/i.test(value)) {
        config.apiHost = value;
      } else if (key.includes("KEY") || /^[A-Za-z0-9_-]{24,80}$/.test(value)) {
        config.apiKey = value;
      }
    }

    return config;
  } catch {
    return { apiKey: "", apiHost: "" };
  }
}

async function readWeatherConfig() {
  const fileConfig = await readApiKeyFileConfig();

  return {
    apiKey: process.env.QWEATHER_API_KEY || process.env.WEATHER_API_KEY || fileConfig.apiKey,
    apiHost: process.env.QWEATHER_API_HOST || process.env.WEATHER_API_HOST || fileConfig.apiHost
  };
}

function requireCity(value) {
  const city = String(value || "").trim();

  if (!city) {
    throw new AppError(400, "BAD_REQUEST", "请提供城市名称");
  }

  if (city.length > 60) {
    throw new AppError(400, "BAD_REQUEST", "城市名称过长");
  }

  return city;
}

function normalizeUnit(unit) {
  return unit === "imperial" ? "imperial" : "metric";
}

function normalizeLang(lang) {
  return lang === "en" ? "en" : "zh";
}

function normalizeIndexTypes(types) {
  const value = String(types || "1,2,3,5,8,9")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item))
    .slice(0, 10)
    .join(",");

  if (!value) {
    throw new AppError(400, "BAD_REQUEST", "请提供合法的生活指数类型");
  }

  return value;
}

function normalizeHours(hours) {
  const value = String(hours || "24h").trim().toLowerCase();
  return ["24h", "72h", "168h"].includes(value) ? value : "24h";
}

function cacheKey(parts) {
  return parts.map((item) => String(item).trim().toLowerCase()).join(":");
}

async function readCities() {
  const raw = await fs.readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.cities) ? parsed.cities : [];
}

async function writeCities(cities) {
  await fs.writeFile(dataFile, `${JSON.stringify({ cities }, null, 2)}\n`, "utf8");
}

app.get("/api/health", (req, res) => {
  ok(res, { status: "ok", service: "weather-query-system" }, { provider: "local" });
});

app.get("/", (req, res) => {
  ok(res, {
    service: "weather-query-system",
    message: "天气查询与城市管理系统后端服务正在运行。前端开发地址通常为 http://127.0.0.1:5173/，接口健康检查为 /api/health。",
    endpoints: [
      "/api/health",
      "/api/geo/search?q=上海",
      "/api/weather/summary?city=上海",
      "/api/weather/hourly?city=上海",
      "/api/weather/warnings?city=上海",
      "/api/weather/air?city=上海"
    ]
  }, { provider: "local" });
});

app.get("/api/geo/search", async (req, res) => {
  try {
    const query = requireCity(req.query.q);
    const lang = normalizeLang(req.query.lang);
    const limit = Number(req.query.limit || 5);
    const key = cacheKey(["geo", query, lang, limit]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await searchLocations({
      ...config,
      query,
      limit,
      lang
    });

    cache.set(key, data, 24 * 60 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/current", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const unit = normalizeUnit(req.query.unit);
    const lang = normalizeLang(req.query.lang);
    const key = cacheKey(["current", city, unit, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getCurrentWeather({
      ...config,
      city,
      unit,
      lang
    });

    cache.set(key, data, 8 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/forecast", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const unit = normalizeUnit(req.query.unit);
    const lang = normalizeLang(req.query.lang);
    const key = cacheKey(["forecast", city, unit, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getForecast({
      ...config,
      city,
      unit,
      lang
    });

    cache.set(key, data, 20 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/summary", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const unit = normalizeUnit(req.query.unit);
    const lang = normalizeLang(req.query.lang);
    const key = cacheKey(["summary", city, unit, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const [current, forecast] = await Promise.all([
      getCurrentWeather({ ...config, city, unit, lang }),
      getForecast({ ...config, city, unit, lang })
    ]);
    const data = { current, forecast };

    cache.set(key, data, 8 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/indices", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const lang = normalizeLang(req.query.lang);
    const types = normalizeIndexTypes(req.query.types);
    const key = cacheKey(["indices", city, types, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getWeatherIndices({
      ...config,
      city,
      types,
      lang
    });

    cache.set(key, data, 30 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/hourly", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const unit = normalizeUnit(req.query.unit);
    const lang = normalizeLang(req.query.lang);
    const hours = normalizeHours(req.query.hours);
    const key = cacheKey(["hourly", city, unit, hours, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getHourlyForecast({
      ...config,
      city,
      unit,
      hours,
      lang
    });

    cache.set(key, data, 10 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/minutely", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const lang = normalizeLang(req.query.lang);
    const key = cacheKey(["minutely", city, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getMinutelyPrecipitation({
      ...config,
      city,
      lang
    });

    cache.set(key, data, 3 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/warnings", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const lang = normalizeLang(req.query.lang);
    const key = cacheKey(["warnings", city, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getWeatherWarnings({
      ...config,
      city,
      lang
    });

    cache.set(key, data, 10 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/weather/air", async (req, res) => {
  try {
    const city = requireCity(req.query.city);
    const lang = normalizeLang(req.query.lang);
    const key = cacheKey(["air", city, lang]);
    const cached = cache.get(key);

    if (cached) {
      ok(res, cached, { cached: true });
      return;
    }

    const config = await readWeatherConfig();
    const data = await getAirQuality({
      ...config,
      city,
      lang
    });

    cache.set(key, data, 15 * 60 * 1000);
    ok(res, data);
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/cities", async (req, res) => {
  try {
    ok(res, { cities: await readCities() }, { provider: "local" });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/cities", async (req, res) => {
  try {
    const name = requireCity(req.body?.name);
    const cities = await readCities();

    if (!cities.some((city) => city.toLowerCase() === name.toLowerCase())) {
      cities.push(name);
      await writeCities(cities);
    }

    ok(res.status(201), { cities }, { provider: "local" });
  } catch (error) {
    fail(res, error);
  }
});

app.delete("/api/cities/:name", async (req, res) => {
  try {
    const name = requireCity(req.params.name);
    const nextCities = (await readCities()).filter((city) => city.toLowerCase() !== name.toLowerCase());
    await writeCities(nextCities);
    ok(res, { cities: nextCities }, { provider: "local" });
  } catch (error) {
    fail(res, error);
  }
});

app.patch("/api/cities/order", async (req, res) => {
  try {
    const cities = Array.isArray(req.body?.cities) ? req.body.cities.map(requireCity) : null;

    if (!cities) {
      throw new AppError(400, "BAD_REQUEST", "请提供城市排序数组");
    }

    const uniqueCities = Array.from(new Set(cities));
    await writeCities(uniqueCities);
    ok(res, { cities: uniqueCities }, { provider: "local" });
  } catch (error) {
    fail(res, error);
  }
});

app.use((req, res) => {
  fail(res, new AppError(404, "NOT_FOUND", "接口不存在"));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Weather API server listening on http://127.0.0.1:${port}`);
});
