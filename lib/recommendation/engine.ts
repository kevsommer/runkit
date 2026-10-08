import { clothing } from "./clothing";
import { config } from "./config";
import {
  classifyRain,
  collectWarnings,
  comfortTemperature,
  isLongRun,
  isStrongWind,
  isSunny,
  pickAccessories,
  pickBottom,
  pickOuter,
  pickSocks,
  pickTop,
  round1,
} from "./rules";
import type { OutfitRecommendation, Reason, RunInput, RunWeather } from "./types";

/**
 * Deterministic outfit recommendation. Same input, same output — no
 * randomness, no clock, no network.
 */
export function recommendOutfit(input: RunInput, weather: RunWeather): OutfitRecommendation {
  const rain = classifyRain(input, weather);
  const strongWind = isStrongWind(weather);
  const comfort = comfortTemperature(input, weather, rain);
  const t = comfort.total;

  const top = clothing[pickTop(t)];
  const bottom = clothing[pickBottom(t)];
  const socks = clothing[pickSocks(t, rain)];
  const outer = pickOuter(t, rain, strongWind);
  const outerLayer = outer ? clothing[outer.id] : undefined;
  const accessories = pickAccessories(t, weather, rain, strongWind).map((id) => clothing[id]);

  const reasons: Reason[] = [];
  const avgTemp = round1((weather.temperatureMin + weather.temperatureMax) / 2);
  const avgFeels = round1(weather.feelsLikeAvg);

  // 1. Effort
  const effort = { runType: input.runType, duration: input.durationMinutes };
  if (input.runType === "race") reasons.push({ code: "RACE_START_COOL", params: effort });
  else if (input.runType === "intervals") reasons.push({ code: "INTERVALS", params: effort });
  else if (input.runType === "tempo") reasons.push({ code: "HIGH_INTENSITY", params: effort });
  else reasons.push({ code: "LOW_INTENSITY", params: effort });

  // 2. Core outfit vs. temperature
  const tempParams = {
    temperature: avgTemp,
    feelsLike: avgFeels,
    top: top.name,
    bottom: bottom.name,
    wind: round1(weather.windSpeedMax),
  };
  if (comfort.baseline >= config.bands.warm) reasons.push({ code: "HIGH_TEMPERATURE", params: tempParams });
  else if (comfort.baseline >= config.bands.cool) reasons.push({ code: "MILD_TEMPERATURE", params: tempParams });
  else reasons.push({ code: "LOW_TEMPERATURE", params: tempParams });

  const extremities = accessories.filter((a) =>
    ["light_gloves", "warm_gloves", "beanie", "neck_gaiter"].includes(a.id),
  );
  if (extremities.length > 0) {
    reasons.push({ code: "EXTREMITIES", params: { items: extremities.map((a) => a.name).join(", ") } });
  }

  // 3. Personal preference
  if (input.temperaturePreference === "cold") reasons.push({ code: "COLD_PREFERENCE", params: {} });
  if (input.temperaturePreference === "hot") reasons.push({ code: "HOT_PREFERENCE", params: {} });

  // 4. Duration
  if (isLongRun(input)) {
    reasons.push({
      code: "LONG_DURATION",
      params: { duration: input.durationMinutes, feelsLikeMin: round1(weather.feelsLikeMin) },
    });
  }

  // 5. Wind
  if (strongWind) {
    reasons.push({
      code: "HIGH_WIND",
      params: {
        wind: round1(weather.windSpeedMax),
        gust: round1(weather.windGustMax ?? 0),
        layer: outer?.because === "wind" && outerLayer ? outerLayer.name : "",
      },
    });
  }

  // 6. Rain
  const rainParams = {
    probability: Math.round(weather.precipitationProbabilityMax),
    amount: round1(weather.precipitationTotal),
    layer: outerLayer?.name ?? "",
  };
  if (rain === "none") reasons.push({ code: "DRY", params: rainParams });
  else if (outer?.because === "rain") reasons.push({ code: "RAIN", params: rainParams });
  else if (outerLayer) reasons.push({ code: "SHOWERS", params: rainParams });
  else reasons.push({ code: "WARM_RAIN", params: rainParams });

  // 7. Sun
  if (isSunny(weather)) {
    reasons.push({ code: "SUN", params: { uv: Math.round(weather.uvIndexMax ?? 0) } });
  }

  return {
    top,
    bottom,
    socks,
    accessories,
    outerLayer,
    reasons,
    warnings: collectWarnings(input, weather, t),
    comfortTemperature: t,
  };
}
