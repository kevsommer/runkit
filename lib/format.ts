import type { TempUnit, WindUnit } from "./store";
import type { Formatters } from "./recommendation/explanations";

export function toUnitTemp(c: number, unit: TempUnit): number {
  return Math.round(unit === "F" ? (c * 9) / 5 + 32 : c);
}

/** "9°" — compact, for large displays. */
export function formatTemp(c: number, unit: TempUnit): string {
  return `${toUnitTemp(c, unit)}°`;
}

/** "9°C" */
export function formatTempWithUnit(c: number, unit: TempUnit): string {
  return `${toUnitTemp(c, unit)}°${unit}`;
}

export function toUnitWind(kmh: number, unit: WindUnit): number {
  if (unit === "mph") return Math.round(kmh * 0.621371);
  if (unit === "ms") return Math.round(kmh / 3.6);
  return Math.round(kmh);
}

export const WIND_UNIT_LABEL: Record<WindUnit, string> = { kmh: "km/h", mph: "mph", ms: "m/s" };

export function formatWind(kmh: number, unit: WindUnit): string {
  return `${toUnitWind(kmh, unit)} ${WIND_UNIT_LABEL[unit]}`;
}

export function formatWindRange(min: number, max: number, unit: WindUnit): string {
  const a = toUnitWind(min, unit);
  const b = toUnitWind(max, unit);
  return a === b ? `${a} ${WIND_UNIT_LABEL[unit]}` : `${a}–${b} ${WIND_UNIT_LABEL[unit]}`;
}

export function formatters(tempUnit: TempUnit, windUnit: WindUnit): Formatters {
  return {
    temp: (c) => formatTempWithUnit(c, tempUnit),
    wind: (k) => formatWind(k, windUnit),
  };
}

export function formatTime(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone }).format(ms);
}

export function dayKey(ms: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(ms);
}

export function formatAge(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
