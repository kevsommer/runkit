/** Helpers for WMO weather interpretation codes (as used by Open-Meteo). */

type ConditionInfo = { label: string; emoji: string; nightEmoji?: string };

const CONDITIONS: Record<number, ConditionInfo> = {
  0: { label: "Clear", emoji: "☀️", nightEmoji: "🌙" },
  1: { label: "Mostly clear", emoji: "🌤️", nightEmoji: "🌙" },
  2: { label: "Partly cloudy", emoji: "⛅", nightEmoji: "☁️" },
  3: { label: "Cloudy", emoji: "☁️" },
  45: { label: "Fog", emoji: "🌫️" },
  48: { label: "Freezing fog", emoji: "🌫️" },
  51: { label: "Light drizzle", emoji: "🌦️" },
  53: { label: "Drizzle", emoji: "🌦️" },
  55: { label: "Heavy drizzle", emoji: "🌧️" },
  56: { label: "Freezing drizzle", emoji: "🌧️" },
  57: { label: "Freezing drizzle", emoji: "🌧️" },
  61: { label: "Light rain", emoji: "🌦️" },
  63: { label: "Rain", emoji: "🌧️" },
  65: { label: "Heavy rain", emoji: "🌧️" },
  66: { label: "Freezing rain", emoji: "🌧️" },
  67: { label: "Freezing rain", emoji: "🌧️" },
  71: { label: "Light snow", emoji: "🌨️" },
  73: { label: "Snow", emoji: "🌨️" },
  75: { label: "Heavy snow", emoji: "❄️" },
  77: { label: "Snow grains", emoji: "🌨️" },
  80: { label: "Light showers", emoji: "🌦️" },
  81: { label: "Showers", emoji: "🌧️" },
  82: { label: "Heavy showers", emoji: "🌧️" },
  85: { label: "Snow showers", emoji: "🌨️" },
  86: { label: "Heavy snow showers", emoji: "❄️" },
  95: { label: "Thunderstorm", emoji: "⛈️" },
  96: { label: "Thunderstorm with hail", emoji: "⛈️" },
  99: { label: "Thunderstorm with hail", emoji: "⛈️" },
};

export function conditionLabel(code: number): string {
  return CONDITIONS[code]?.label ?? "Unknown";
}

export function conditionEmoji(code: number, isDay = true): string {
  const c = CONDITIONS[code];
  if (!c) return "🌡️";
  return !isDay && c.nightEmoji ? c.nightEmoji : c.emoji;
}

export const isThunderstorm = (code: number) => code >= 95;
export const isSnow = (code: number) => (code >= 71 && code <= 77) || code === 85 || code === 86;
export const isFreezing = (code: number) => [48, 56, 57, 66, 67].includes(code);
export const isFog = (code: number) => code === 45 || code === 48;
export const isPrecipitation = (code: number) => code >= 51;
