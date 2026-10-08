import type { NextRequest } from "next/server";
import { getGeocodingProvider, parseCoordinates } from "@/lib/weather/provider";

export async function GET(request: NextRequest) {
  const coords = parseCoordinates(request.nextUrl.searchParams);
  if (!coords) {
    return Response.json({ error: "invalid_location" }, { status: 400 });
  }
  try {
    const location = await getGeocodingProvider().reverse(coords);
    return Response.json({ location }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (err) {
    console.error("reverse geocode failed", err);
    return Response.json({ location: null });
  }
}
