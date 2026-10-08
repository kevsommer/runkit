import type { NextRequest } from "next/server";
import { getGeocodingProvider } from "@/lib/weather/provider";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ results: [] });
  }
  try {
    const results = await getGeocodingProvider().search(query);
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (err) {
    console.error("geocode failed", err);
    return Response.json({ error: "geocoding_unavailable" }, { status: 502 });
  }
}
