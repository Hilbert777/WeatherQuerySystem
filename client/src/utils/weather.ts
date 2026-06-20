const WEATHER_ICONS: Record<string, string> = {
  "100": "☀",
  "101": "⛅",
  "102": "⛅",
  "103": "🌤",
  "104": "☁",
  "150": "☾",
  "151": "☁",
  "300": "🌦",
  "301": "🌧",
  "302": "⛈",
  "303": "⛈",
  "305": "🌧",
  "306": "🌧",
  "307": "🌧",
  "308": "🌧",
  "309": "🌧",
  "310": "🌧",
  "311": "🌧",
  "312": "🌧",
  "313": "🌧",
  "314": "🌧",
  "315": "🌧",
  "316": "🌧",
  "317": "🌧",
  "318": "🌧",
  "399": "🌧",
  "400": "🌨",
  "401": "🌨",
  "402": "🌨",
  "403": "❄",
  "404": "🌨",
  "405": "🌨",
  "406": "🌨",
  "407": "🌨",
  "499": "🌨",
  "500": "🌫",
  "501": "🌫",
  "502": "🌫",
  "503": "🌫",
  "504": "🌫",
  "507": "🌫",
  "508": "🌫",
  "900": "🔥",
  "901": "🧊"
};

export function weatherIcon(icon?: string) {
  return icon ? WEATHER_ICONS[icon] || "◌" : "◌";
}

export function formatTemperature(value: number | undefined, symbol: string) {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)}${symbol}`;
}

export function formatRelativeTime(value?: string) {
  if (!value) {
    return "尚未更新";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "尚未更新";
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));

  if (minutes < 1) {
    return "刚刚";
  }

  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function weatherAdvice(condition: string, humidity?: number, windSpeed?: number) {
  const text = condition || "天气";

  if (text.includes("雨")) {
    return "降雨概率较高，出门建议带伞并预留通勤时间。";
  }

  if (text.includes("雪")) {
    return "道路可能湿滑，外出注意防寒和交通安全。";
  }

  if (text.includes("晴") && humidity !== undefined && humidity < 45) {
    return "天气较晴朗，空气偏干，适合短途出行。";
  }

  if (windSpeed !== undefined && windSpeed >= 20) {
    return "风力偏强，户外活动注意防风。";
  }

  return "天气整体平稳，可根据温度变化安排出行。";
}

