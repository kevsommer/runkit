import type { NextRequest } from "next/server";
import { getWeatherProvider, parseCoordinates } from "@/lib/weather/provider";

export async function GET(request: NextRequest) {
  const coords = parseCoordinates(request.nextUrl.searchParams);
  if (!coords) {
    return Response.json({ error: "invalid_location" }, { status: 400 });
  }
  try {
    const data = await getWeatherProvider().getForecast(coords);
    return Response.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("weather fetch failed", err);
    return Response.json({ error: "weather_unavailable" }, { status: 502 });
  }
}
