import type { RunWeather, WeatherSnapshot } from "../recommendation/types";
import { config } from "../recommendation/config";
import { conditionLabel } from "./conditions";
import type { HourlyWeather, WeatherData } from "./types";

const HOUR = 3_600_000;
const MINUTE = 60_000;
/** Within this window of `current.time`, prefer observed current conditions. */
const CURRENT_WINDOW = 30 * MINUTE;

export class NoForecastError extends Error {
  constructor() {
    super("No forecast available for this run window.");
    this.name = "NoForecastError";
  }
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpOpt = (a: number | undefined, b: number | undefined, k: number) =>
  a === undefined || b === undefined ? (a ?? b) : lerp(a, b, k);

/** Latest moment the hourly forecast can describe. */
export function forecastEnd(data: WeatherData): number {
  return data.hourly.length ? data.hourly[data.hourly.length - 1].time : 0;
}

/** Interpolated conditions at an instant. */
export function sampleAt(data: WeatherData, t: number): WeatherSnapshot {
  const { hourly, current } = data;
  if (Math.abs(t - current.time) <= CURRENT_WINDOW) return current;

  let i = hourly.findIndex((h) => h.time > t) - 1;
  if (i < 0) i = hourly[0]?.time > t ? 0 : hourly.length - 1;
  const a = hourly[i];
  const b = hourly[Math.min(i + 1, hourly.length - 1)];
  const k = b.time === a.time ? 0 : Math.min(1, Math.max(0, (t - a.time) / (b.time - a.time)));
  const near = k < 0.5 ? a : b;
  return {
    temperature: lerp(a.temperature, b.temperature, k),
    feelsLike: lerp(a.feelsLike, b.feelsLike, k),
    windSpeed: lerp(a.windSpeed, b.windSpeed, k),
    windGust: lerpOpt(a.windGust, b.windGust, k),
    humidity: lerpOpt(a.humidity, b.humidity, k),
    cloudCover: lerpOpt(a.cloudCover, b.cloudCover, k),
    uvIndex: lerpOpt(a.uvIndex, b.uvIndex, k),
    precipitationProbability: b.precipitationProbability,
    precipitationAmount: b.precipitationAmount,
    isDay: a.isDay,
    weatherCode: near.weatherCode,
    condition: near.condition,
  };
}

/**
 * Aggregate the forecast over [start, start + duration].
 * Throws NoForecastError if the forecast doesn't cover the window.
 */
export function summarizeRunWeather(
  data: WeatherData,
  startMs: number,
  durationMinutes: number,
): RunWeather {
  const endMs = startMs + durationMinutes * MINUTE;
  if (!data.hourly.length || forecastEnd(data) < endMs || data.hourly[0].time > startMs) {
    throw new NoForecastError();
  }

  // Instantaneous samples: start, every forecast hour inside the run, end.
  const times = [startMs, ...data.hourly.map((h) => h.time).filter((t) => t > startMs && t < endMs), endMs];
  const samples = times.map((t) => sampleAt(data, t));

  // Precipitation: each hourly record covers the preceding hour.
  const wetProbability = config.rain.wetHourProbability;
  let total = 0;
  let wetMs = 0;
  let probMax = 0;
  let onset: number | undefined;
  let code = samples[0].weatherCode;
  const overlapping: HourlyWeather[] = [];
  for (const h of data.hourly) {
    const from = Math.max(h.time - HOUR, startMs);
    const to = Math.min(h.time, endMs);
    const overlap = to - from;
    if (overlap <= 0) continue;
    overlapping.push(h);
    total += (h.precipitationAmount ?? 0) * (overlap / HOUR);
    probMax = Math.max(probMax, h.precipitationProbability);
    if (h.precipitationProbability >= wetProbability) {
      wetMs += overlap;
      onset ??= from;
    }
    code = Math.max(code, h.weatherCode);
  }
  // Starting now: observed conditions count too.
  if (Math.abs(startMs - data.current.time) <= CURRENT_WINDOW) {
    probMax = Math.max(probMax, data.current.precipitationProbability);
    code = Math.max(code, data.current.weatherCode);
  }

  const duration = endMs - startMs;
  const temps = samples.map((s) => s.temperature);
  const feels = samples.map((s) => s.feelsLike);
  const winds = samples.map((s) => s.windSpeed);
  const gusts = [...samples, ...overlapping].map((s) => s.windGust).filter((g): g is number => g !== undefined);
  const hums = samples.map((s) => s.humidity).filter((h): h is number => h !== undefined);
  const uvs = [...samples, ...overlapping].map((s) => s.uvIndex).filter((u): u is number => u !== undefined);
  const clouds = samples.map((s) => s.cloudCover).filter((c): c is number => c !== undefined);

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  return {
    start: samples[0],
    end: samples[samples.length - 1],
    temperatureMin: Math.min(...temps),
    temperatureMax: Math.max(...temps),
    feelsLikeMin: Math.min(...feels),
    feelsLikeMax: Math.max(...feels),
    feelsLikeAvg: avg(feels),
    windSpeedMin: Math.min(...winds),
    windSpeedMax: Math.max(...winds),
    windGustMax: gusts.length ? Math.max(...gusts) : undefined,
    precipitationProbabilityMax: probMax,
    precipitationTotal: total,
    wetFraction: duration > 0 ? wetMs / duration : 0,
    rainOnset: onset === undefined ? undefined : (onset - startMs) / duration,
    humidityMin: hums.length ? Math.min(...hums) : undefined,
    humidityMax: hums.length ? Math.max(...hums) : undefined,
    uvIndexMax: uvs.length ? Math.max(...uvs) : undefined,
    cloudCoverAvg: clouds.length ? avg(clouds) : undefined,
    hasDarkness: samples.some((s) => s.isDay === false),
    weatherCode: code,
  };
}

/** Build a RunWeather from a single unchanging snapshot (handy for tests). */
export function constantRunWeather(s: Omit<WeatherSnapshot, "condition"> & { condition?: string }): RunWeather {
  const snap: WeatherSnapshot = { ...s, condition: s.condition ?? conditionLabel(s.weatherCode) };
  const p = snap.precipitationProbability;
  const wet = p >= config.rain.wetHourProbability;
  return {
    start: snap,
    end: snap,
    temperatureMin: snap.temperature,
    temperatureMax: snap.temperature,
    feelsLikeMin: snap.feelsLike,
    feelsLikeMax: snap.feelsLike,
    feelsLikeAvg: snap.feelsLike,
    windSpeedMin: snap.windSpeed,
    windSpeedMax: snap.windSpeed,
    windGustMax: snap.windGust,
    precipitationProbabilityMax: p,
    precipitationTotal: snap.precipitationAmount ?? 0,
    wetFraction: wet ? 1 : 0,
    rainOnset: wet ? 0 : undefined,
    humidityMin: snap.humidity,
    humidityMax: snap.humidity,
    uvIndexMax: snap.uvIndex,
    cloudCoverAvg: snap.cloudCover,
    hasDarkness: snap.isDay === false,
    weatherCode: snap.weatherCode,
  };
}
