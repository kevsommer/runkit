import { describe, expect, it } from "vitest";
import { NoForecastError, summarizeRunWeather } from "./runWindow";
import type { HourlyWeather, WeatherData } from "./types";

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 9, 8, 0, 0); // midnight

function hour(i: number, o: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    time: T0 + i * HOUR,
    temperature: 10,
    feelsLike: 8,
    windSpeed: 10,
    windGust: 20,
    precipitationProbability: 0,
    precipitationAmount: 0,
    humidity: 70,
    cloudCover: 50,
    uvIndex: 0,
    isDay: true,
    weatherCode: 2,
    condition: "Partly cloudy",
    ...o,
  };
}

function data(hours: HourlyWeather[]): WeatherData {
  return {
    latitude: 52.5,
    longitude: 13.4,
    timezone: "Europe/Berlin",
    fetchedAt: T0,
    current: { ...hours[0] },
    hourly: hours,
  };
}

describe("summarizeRunWeather", () => {
  it("uses the forecast for the run window, not the current weather", () => {
    const hours = Array.from({ length: 24 }, (_, i) =>
      hour(i, { temperature: i < 18 ? 15 : 10 - (i - 18) * 2, feelsLike: i < 18 ? 14 : 8 - (i - 18) * 2 }),
    );
    // 18:00 for 90 minutes → 18:00 (10°) … 19:30 (between 8° and 6° → 7°)
    const w = summarizeRunWeather(data(hours), T0 + 18 * HOUR, 90);
    expect(w.start.temperature).toBe(10);
    expect(w.end.temperature).toBeCloseTo(7);
    expect(w.temperatureMax).toBe(10);
    expect(w.temperatureMin).toBeCloseTo(7);
  });

  it("captures rain later in the run", () => {
    const hours = Array.from({ length: 24 }, (_, i) =>
      hour(i, i === 20 ? { precipitationProbability: 80, precipitationAmount: 2, weatherCode: 63 } : {}),
    );
    // 18:00–20:00; the 20:00 bucket covers 19:00–20:00 → second half
    const w = summarizeRunWeather(data(hours), T0 + 18 * HOUR, 120);
    expect(w.precipitationProbabilityMax).toBe(80);
    expect(w.precipitationTotal).toBeCloseTo(2);
    expect(w.wetFraction).toBeCloseTo(0.5);
    expect(w.rainOnset).toBeCloseTo(0.5);
    expect(w.weatherCode).toBe(63);
  });

  it("flags darkness", () => {
    const hours = Array.from({ length: 24 }, (_, i) => hour(i, { isDay: i < 19 }));
    expect(summarizeRunWeather(data(hours), T0 + 18 * HOUR, 90).hasDarkness).toBe(true);
    expect(summarizeRunWeather(data(hours), T0 + 12 * HOUR, 60).hasDarkness).toBe(false);
  });

  it("throws when the forecast doesn't cover the run", () => {
    const hours = Array.from({ length: 6 }, (_, i) => hour(i));
    expect(() => summarizeRunWeather(data(hours), T0 + 5 * HOUR, 60)).toThrow(NoForecastError);
  });
});
