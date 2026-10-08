import type { WeatherSnapshot } from "../recommendation/types";

export type { WeatherSnapshot };

export type GeoLocation = {
  name: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  source: "gps" | "search";
};

/** A snapshot at a point in time (epoch ms). */
export type TimedWeather = WeatherSnapshot & { time: number };

/**
 * One hour of forecast. Instantaneous values (temperature, wind…) are for
 * `time`; precipitation amount and probability cover the preceding hour.
 */
export type HourlyWeather = TimedWeather;

export type WeatherData = {
  latitude: number;
  longitude: number;
  /** IANA timezone of the location, e.g. "Europe/Berlin". */
  timezone: string;
  /** When this data was fetched (epoch ms). */
  fetchedAt: number;
  current: TimedWeather;
  hourly: HourlyWeather[];
};

export type Coordinates = { latitude: number; longitude: number };

export interface WeatherProvider {
  getCurrentWeather(location: Coordinates): Promise<TimedWeather>;
  getHourlyForecast(location: Coordinates): Promise<HourlyWeather[]>;
  /** Current + hourly in one round trip, where the provider supports it. */
  getForecast(location: Coordinates): Promise<WeatherData>;
}

export interface GeocodingProvider {
  search(query: string): Promise<GeoLocation[]>;
  reverse(location: Coordinates): Promise<GeoLocation | null>;
}
