import { conditionLabel } from "./conditions";
import type {
  Coordinates,
  GeoLocation,
  GeocodingProvider,
  HourlyWeather,
  TimedWeather,
  WeatherData,
  WeatherProvider,
} from "./types";

// Server-only: reads private environment variables.

const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "uv_index",
  "is_day",
] as const;

const CURRENT_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "uv_index",
  "is_day",
] as const;

type Series = Record<(typeof HOURLY_VARS)[number], (number | null)[]> & { time: number[] };
type Current = Record<(typeof CURRENT_VARS)[number], number | null> & { time: number };

type ForecastResponse = {
  latitude: number;
  longitude: number;
  timezone: string;
  current: Current;
  hourly: Series;
};

export class UpstreamError extends Error {}

const num = (v: number | null | undefined, fallback = 0) => (typeof v === "number" ? v : fallback);
const opt = (v: number | null | undefined) => (typeof v === "number" ? v : undefined);

function withKey(url: URL) {
  const key = process.env.WEATHER_API_KEY;
  if (key) url.searchParams.set("apikey", key);
  return url;
}

async function getJson<T>(url: URL, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new UpstreamError(`Upstream responded ${res.status}`);
  return (await res.json()) as T;
}

export class OpenMeteoProvider implements WeatherProvider {
  private baseUrl = process.env.WEATHER_API_BASE_URL || "https://api.open-meteo.com/v1";

  async getForecast({ latitude, longitude }: Coordinates): Promise<WeatherData> {
    const url = withKey(new URL(`${this.baseUrl.replace(/\/$/, "")}/forecast`));
    url.search = new URLSearchParams({
      ...Object.fromEntries(url.searchParams),
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: CURRENT_VARS.join(","),
      hourly: HOURLY_VARS.join(","),
      timezone: "auto",
      timeformat: "unixtime",
      wind_speed_unit: "kmh",
      past_hours: "2",
      forecast_hours: "48",
    }).toString();

    const r = await getJson<ForecastResponse>(url);
    const h = r.hourly;
    const hourly: HourlyWeather[] = h.time.map((t, i) => {
      const code = num(h.weather_code[i]);
      return {
        time: t * 1000,
        temperature: num(h.temperature_2m[i]),
        feelsLike: num(h.apparent_temperature[i], num(h.temperature_2m[i])),
        humidity: opt(h.relative_humidity_2m[i]),
        precipitationProbability: num(h.precipitation_probability[i]),
        precipitationAmount: num(h.precipitation[i]),
        weatherCode: code,
        condition: conditionLabel(code),
        cloudCover: opt(h.cloud_cover[i]),
        windSpeed: num(h.wind_speed_10m[i]),
        windGust: opt(h.wind_gusts_10m[i]),
        uvIndex: opt(h.uv_index[i]),
        isDay: h.is_day[i] === 1,
      };
    });

    const c = r.current;
    const nowMs = c.time * 1000;
    // Current conditions don't include probability; take it from the hour in progress.
    const bucket = hourly.find((x) => x.time > nowMs);
    const code = num(c.weather_code);
    const current: TimedWeather = {
      time: nowMs,
      temperature: num(c.temperature_2m),
      feelsLike: num(c.apparent_temperature, num(c.temperature_2m)),
      humidity: opt(c.relative_humidity_2m),
      precipitationProbability: bucket?.precipitationProbability ?? 0,
      precipitationAmount: opt(c.precipitation),
      weatherCode: code,
      condition: conditionLabel(code),
      cloudCover: opt(c.cloud_cover),
      windSpeed: num(c.wind_speed_10m),
      windGust: opt(c.wind_gusts_10m),
      uvIndex: opt(c.uv_index),
      isDay: c.is_day === 1,
    };

    return {
      latitude: r.latitude,
      longitude: r.longitude,
      timezone: r.timezone,
      fetchedAt: Date.now(),
      current,
      hourly,
    };
  }

  async getCurrentWeather(location: Coordinates) {
    return (await this.getForecast(location)).current;
  }

  async getHourlyForecast(location: Coordinates) {
    return (await this.getForecast(location)).hourly;
  }
}

type GeoResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

type NominatimResult = {
  address?: Record<string, string | undefined>;
  name?: string;
};

export class OpenMeteoGeocoder implements GeocodingProvider {
  private baseUrl = process.env.GEOCODING_API_BASE_URL || "https://geocoding-api.open-meteo.com/v1";
  private reverseUrl = process.env.REVERSE_GEOCODING_API_BASE_URL || "https://nominatim.openstreetmap.org";

  async search(query: string): Promise<GeoLocation[]> {
    const url = withKey(new URL(`${this.baseUrl.replace(/\/$/, "")}/search`));
    url.searchParams.set("name", query);
    url.searchParams.set("count", "6");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const r = await getJson<{ results?: GeoResult[] }>(url);
    return (r.results ?? []).map((g) => ({
      name: g.name,
      region: g.admin1,
      country: g.country,
      latitude: g.latitude,
      longitude: g.longitude,
      source: "search",
    }));
  }

  async reverse({ latitude, longitude }: Coordinates): Promise<GeoLocation | null> {
    const url = new URL(`${this.reverseUrl.replace(/\/$/, "")}/reverse`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", latitude.toFixed(4));
    url.searchParams.set("lon", longitude.toFixed(4));
    url.searchParams.set("zoom", "12");
    url.searchParams.set("accept-language", "en");
    const r = await getJson<NominatimResult>(url, {
      headers: { "User-Agent": "RunKit/0.1 (running outfit PWA)" },
    });
    const a = r.address ?? {};
    const name =
      a.city ?? a.town ?? a.village ?? a.suburb ?? a.municipality ?? a.county ?? r.name;
    if (!name) return null;
    return { name, region: a.state, country: a.country, latitude, longitude, source: "gps" };
  }
}
