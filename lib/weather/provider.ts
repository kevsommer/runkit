import { OpenMeteoGeocoder, OpenMeteoProvider } from "./openMeteo";
import type { Coordinates, GeocodingProvider, WeatherProvider } from "./types";

// Server-only entry point. Swap implementations here to change provider.

export function getWeatherProvider(): WeatherProvider {
  return new OpenMeteoProvider();
}

export function getGeocodingProvider(): GeocodingProvider {
  return new OpenMeteoGeocoder();
}

export function parseCoordinates(params: URLSearchParams): Coordinates | null {
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  if (
    !params.get("lat") ||
    !params.get("lon") ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}
