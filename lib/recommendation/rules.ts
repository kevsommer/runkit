import { config } from "./config";
import type { ClothingId, RunInput, RunWeather, Warning } from "./types";
import { isFog, isFreezing, isPrecipitation, isSnow, isThunderstorm } from "../weather/conditions";

const c = config.clothing;

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function isLongRun(input: RunInput): boolean {
  return input.durationMinutes >= config.longDurationMinutes;
}

/**
 * Baseline temperature before personal adjustments: mostly feels-like,
 * partly actual. Long runs lean toward the coolest point of the run.
 */
export function baselineTemperature(input: RunInput, w: RunWeather): number {
  const avgTemp = (w.temperatureMin + w.temperatureMax) / 2;
  let feels = w.feelsLikeAvg;
  let temp = avgTemp;
  if (isLongRun(input)) {
    const k = config.longDurationMinWeight;
    feels = feels * (1 - k) + w.feelsLikeMin * k;
    temp = temp * (1 - k) + w.temperatureMin * k;
  }
  return feels * config.feelsLikeWeight + temp * (1 - config.feelsLikeWeight);
}

export function isStrongWind(w: RunWeather): boolean {
  return (
    w.windSpeedMax >= config.wind.strong ||
    (w.windGustMax ?? 0) >= config.wind.strongGust
  );
}

export type RainLevel = "none" | "showers" | "heavy";

export function classifyRain(input: RunInput, w: RunWeather): RainLevel {
  const r = config.rain;
  const p = w.precipitationProbabilityMax;
  const minProbability = isLongRun(input) ? r.lowProbabilityLongRun : r.lowProbability;
  if (p < minProbability) return "none";
  const prolonged = w.wetFraction >= r.prolongedFraction;
  if (p >= r.likelyProbability && (w.precipitationTotal >= r.heavyAmount || prolonged)) {
    return "heavy";
  }
  return "showers";
}

export type ComfortBreakdown = {
  baseline: number;
  intensity: number;
  preference: number;
  wind: number;
  rain: number;
  total: number;
};

export function comfortTemperature(
  input: RunInput,
  w: RunWeather,
  rain: RainLevel,
): ComfortBreakdown {
  const baseline = baselineTemperature(input, w);
  const intensity = config.intensityOffset[input.runType];
  const preference = config.preferenceOffset[input.temperaturePreference];
  const wind = isStrongWind(w) ? -config.wind.strongPenalty : 0;
  const preRain = baseline + intensity + preference + wind;
  // Getting wet only costs warmth when it isn't already warm.
  let rainPenalty = 0;
  if (preRain < config.rain.jacketBelowComfort) {
    if (rain === "heavy") rainPenalty = -config.rain.heavyPenalty;
    else if (rain === "showers") rainPenalty = -config.rain.showersPenalty;
  }
  return {
    baseline: round1(baseline),
    intensity,
    preference,
    wind,
    rain: rainPenalty,
    total: round1(preRain + rainPenalty),
  };
}

export function pickTop(t: number): ClothingId {
  if (t >= c.shortSleeveAbove) return "short_sleeve";
  if (t >= c.thermalBelow) return "light_long_sleeve";
  return "thermal_long_sleeve";
}

export function pickBottom(t: number): ClothingId {
  if (t >= c.shortsAbove) return "shorts";
  if (t >= c.halfTightsAbove) return "half_tights";
  if (t >= c.thermalTightsBelow) return "light_tights";
  if (t >= c.trousersBelow) return "thermal_tights";
  return "running_trousers";
}

export function pickSocks(t: number, rain: RainLevel): ClothingId {
  if (t < c.heavySocksBelow) return "heavy_socks";
  if (t < c.mediumSocksBelow || rain === "heavy") return "medium_socks";
  return "light_socks";
}

export type OuterChoice = { id: ClothingId; because: "rain" | "showers" | "wind" | "cold" } | null;

export function pickOuter(t: number, rain: RainLevel, strongWind: boolean): OuterChoice {
  if (rain === "heavy" && t < config.rain.jacketBelowComfort) {
    return { id: "waterproof_shell", because: "rain" };
  }
  if (t < c.insulatedJacketBelow) return { id: "insulated_jacket", because: "cold" };
  if (rain === "showers" && t < config.wind.layerBelowComfort) {
    return { id: "windbreaker", because: "showers" };
  }
  if (strongWind && t < config.wind.layerBelowComfort) {
    return { id: "windbreaker", because: "wind" };
  }
  if (t < c.windbreakerBelow) return { id: "windbreaker", because: "cold" };
  return null;
}

export function isSunny(w: RunWeather): boolean {
  return (
    !w.hasDarkness &&
    (w.uvIndexMax ?? 0) >= config.sun.uvForProtection &&
    (w.cloudCoverAvg ?? 100) < config.sun.sunnyCloudCover
  );
}

export function pickAccessories(
  t: number,
  w: RunWeather,
  rain: RainLevel,
  strongWind: boolean,
): ClothingId[] {
  const items: ClothingId[] = [];
  if (t < c.warmGlovesBelow) items.push("warm_gloves");
  else if (t < c.lightGlovesBelow) items.push("light_gloves");

  const beanie = t < c.beanieBelow;
  if (beanie) items.push("beanie");

  if (t < c.neckGaiterBelow || (strongWind && t < c.neckGaiterWindyBelow)) {
    items.push("neck_gaiter");
  }

  const sunny = isSunny(w);
  const rainCap = rain !== "none" && t < c.rainCapBelow;
  if (!beanie && (sunny || rainCap)) items.push("cap");
  if (sunny) items.push("sunglasses");
  return items;
}

const SEVERITY_ORDER = { danger: 0, caution: 1, info: 2 } as const;

export function collectWarnings(input: RunInput, w: RunWeather, comfort: number): Warning[] {
  const cw = config.warnings;
  const out: Warning[] = [];
  const code = w.weatherCode;

  if (isThunderstorm(code)) out.push({ code: "THUNDERSTORM", severity: "danger", params: {} });

  if (w.feelsLikeMax >= cw.extremeHeatFeelsLike) {
    out.push({ code: "EXTREME_HEAT", severity: "danger", params: { feelsLike: round1(w.feelsLikeMax) } });
  } else if (w.feelsLikeMax >= cw.heatFeelsLike) {
    out.push({
      code: "HEAT",
      severity: "caution",
      params: { feelsLike: round1(w.feelsLikeMax), duration: input.durationMinutes },
    });
  }

  if (w.feelsLikeMin <= cw.extremeColdFeelsLike) {
    out.push({ code: "EXTREME_COLD", severity: "danger", params: { feelsLike: round1(w.feelsLikeMin) } });
  }

  const gust = w.windGustMax ?? 0;
  if (w.windSpeedMax >= config.wind.dangerSpeed || gust >= config.wind.dangerGust) {
    out.push({ code: "DANGEROUS_WIND", severity: "danger", params: { wind: round1(w.windSpeedMax), gust: round1(gust) } });
  } else if (w.windSpeedMax >= config.wind.warnSpeed || gust >= config.wind.warnGust) {
    out.push({ code: "STRONG_WIND", severity: "caution", params: { wind: round1(w.windSpeedMax), gust: round1(gust) } });
  }

  const wet = w.precipitationProbabilityMax >= config.rain.wetHourProbability || isPrecipitation(code);
  if (isFreezing(code) || (wet && w.temperatureMin <= cw.iceTemperature && !isSnow(code))) {
    out.push({ code: "ICE", severity: "caution", params: {} });
  } else if (isSnow(code)) {
    out.push({ code: "SNOW", severity: "caution", params: {} });
  }

  if (w.rainOnset !== undefined) {
    const phase = w.wetFraction >= 0.8 ? "throughout" : w.rainOnset >= 0.4 ? "second_half" : "first_half";
    out.push({
      code: "RAIN_TIMING",
      severity: "info",
      params: { phase, probability: Math.round(w.precipitationProbabilityMax) },
    });
  }

  const delta = w.end.temperature - w.start.temperature;
  if (delta <= -cw.temperatureChange) {
    out.push({ code: "TEMPERATURE_DROP", severity: "info", params: { from: w.start.temperature, to: w.end.temperature } });
  } else if (delta >= cw.temperatureChange) {
    out.push({ code: "TEMPERATURE_RISE", severity: "info", params: { from: w.start.temperature, to: w.end.temperature } });
  }

  if (w.start.feelsLike < cw.coldStartFeelsLike && comfort < config.clothing.shortSleeveAbove + 4) {
    out.push({ code: "COLD_START", severity: "info", params: { feelsLike: round1(w.start.feelsLike) } });
  }

  if ((w.uvIndexMax ?? 0) >= cw.highUv) {
    out.push({ code: "HIGH_UV", severity: "caution", params: { uv: Math.round(w.uvIndexMax ?? 0) } });
  }

  if (isFog(code)) out.push({ code: "FOG", severity: "info", params: {} });

  if (w.hasDarkness) out.push({ code: "DARKNESS", severity: "info", params: {} });

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
