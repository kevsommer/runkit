import { describe, expect, it } from "vitest";
import { recommendOutfit } from "./engine";
import { describeReason, describeWarning } from "./explanations";
import type { OutfitRecommendation, RunInput, RunType, TemperaturePreference } from "./types";
import { constantRunWeather } from "../weather/runWindow";

type Conditions = {
  temperature: number;
  feelsLike?: number;
  wind?: number;
  gust?: number;
  rainChance?: number;
  rainMm?: number;
  code?: number;
  uv?: number;
  cloud?: number;
  isDay?: boolean;
};

function run(
  w: Conditions,
  runType: RunType = "easy",
  durationMinutes = 45,
  temperaturePreference: TemperaturePreference = "normal",
): OutfitRecommendation {
  const input: RunInput = {
    durationMinutes,
    runType,
    startTime: "2026-01-01T18:00:00Z",
    temperaturePreference,
  };
  const weather = constantRunWeather({
    temperature: w.temperature,
    // Light wind: feels-like a couple of degrees under air temperature.
    feelsLike: w.feelsLike ?? w.temperature - 2,
    windSpeed: w.wind ?? 8,
    windGust: w.gust,
    precipitationProbability: w.rainChance ?? 0,
    precipitationAmount: w.rainMm ?? 0,
    humidity: 70,
    cloudCover: w.cloud ?? 80,
    uvIndex: w.uv ?? 1,
    isDay: w.isDay ?? true,
    weatherCode: w.code ?? 3,
  });
  return recommendOutfit(input, weather);
}

const ids = (r: OutfitRecommendation) => ({
  top: r.top.id,
  bottom: r.bottom.id,
  outer: r.outerLayer?.id,
  socks: r.socks.id,
  accessories: r.accessories.map((a) => a.id),
});
const reasonCodes = (r: OutfitRecommendation) => r.reasons.map((x) => x.code);
const warningCodes = (r: OutfitRecommendation) => r.warnings.map((x) => x.code);

/** Rough warmth score so tests can compare "warmer"/"lighter" outfits. */
const TOP = { short_sleeve: 0, light_long_sleeve: 1, thermal_long_sleeve: 2 } as Record<string, number>;
const BOTTOM = { shorts: 0, half_tights: 1, light_tights: 2, thermal_tights: 3, running_trousers: 4 } as Record<string, number>;
function warmth(r: OutfitRecommendation): number {
  return (
    TOP[r.top.id] * 2 +
    BOTTOM[r.bottom.id] +
    (r.outerLayer ? 2 : 0) +
    r.accessories.filter((a) => ["light_gloves", "warm_gloves", "beanie", "neck_gaiter"].includes(a.id)).length
  );
}

describe("spec calibration cases", () => {
  it("8°C / low wind / easy → warm-ish outfit", () => {
    const r = ids(run({ temperature: 8 }, "easy"));
    expect(r.top).toBe("light_long_sleeve");
    expect(["half_tights", "light_tights"]).toContain(r.bottom);
    expect(r.outer).toBeUndefined();
  });

  it("8°C / low wind / tempo → lighter than easy", () => {
    const easy = run({ temperature: 8 }, "easy");
    const tempo = run({ temperature: 8 }, "tempo");
    expect(warmth(tempo)).toBeLessThan(warmth(easy));
    expect(tempo.bottom.id).toBe("shorts");
  });

  it("2°C / high wind / easy → thermal + tights + gloves + wind layer", () => {
    const r = ids(run({ temperature: 2, feelsLike: -3, wind: 30, gust: 50 }, "easy"));
    expect(r.top).toBe("thermal_long_sleeve");
    expect(["light_tights", "thermal_tights"]).toContain(r.bottom);
    expect(r.accessories.some((a) => a.includes("gloves"))).toBe(true);
    expect(r.outer).toBe("windbreaker");
  });

  it("18°C / tempo → short sleeve + shorts", () => {
    const r = ids(run({ temperature: 18, feelsLike: 18 }, "tempo"));
    expect(r.top).toBe("short_sleeve");
    expect(r.bottom).toBe("shorts");
    expect(r.outer).toBeUndefined();
    expect(r.accessories).not.toContain("light_gloves");
  });

  it("25°C / easy → minimal clothing + heat warning", () => {
    const rec = run({ temperature: 25, feelsLike: 26, uv: 7, cloud: 10, code: 0 }, "easy");
    expect(rec.top.id).toBe("short_sleeve");
    expect(rec.bottom.id).toBe("shorts");
    expect(rec.socks.id).toBe("light_socks");
    expect(rec.outerLayer).toBeUndefined();
    expect(warningCodes(rec)).toContain("HEAT");
    expect(ids(rec).accessories).toEqual(["cap", "sunglasses"]);
  });

  it("10°C / heavy rain → rain protection", () => {
    const rec = run({ temperature: 10, feelsLike: 8, rainChance: 90, rainMm: 6, code: 63 }, "easy");
    expect(rec.outerLayer?.id).toBe("waterproof_shell");
    expect(reasonCodes(rec)).toContain("RAIN");
    expect(warningCodes(rec)).toContain("RAIN_TIMING");
  });

  it("5°C / 25 km/h wind → wind protection", () => {
    const rec = run({ temperature: 5, feelsLike: 1, wind: 25 }, "easy");
    expect(rec.outerLayer?.id).toBe("windbreaker");
    expect(reasonCodes(rec)).toContain("HIGH_WIND");
  });

  it("8°C / 60 min / cold preference → slightly warmer", () => {
    const normal = run({ temperature: 8 }, "easy", 60, "normal");
    const cold = run({ temperature: 8 }, "easy", 60, "cold");
    expect(warmth(cold)).toBeGreaterThan(warmth(normal));
    expect(ids(cold)).toMatchObject({ top: "light_long_sleeve", bottom: "light_tights" });
    expect(ids(cold).accessories).toContain("light_gloves");
    expect(reasonCodes(cold)).toContain("COLD_PREFERENCE");
  });

  it("8°C / 60 min / hot preference → slightly lighter", () => {
    const normal = run({ temperature: 8 }, "easy", 60, "normal");
    const hot = run({ temperature: 8 }, "easy", 60, "hot");
    expect(warmth(hot)).toBeLessThan(warmth(normal));
    expect(ids(hot)).toMatchObject({ top: "short_sleeve", bottom: "shorts" });
    expect(reasonCodes(hot)).toContain("HOT_PREFERENCE");
  });
});

describe("intensity at 7°C (calibration targets)", () => {
  const at7 = (t: RunType) => ids(run({ temperature: 7, feelsLike: 5 }, t, 60));

  it("easy → long sleeve + tights + gloves", () => {
    expect(at7("easy")).toMatchObject({ top: "light_long_sleeve", bottom: "light_tights" });
    expect(at7("easy").accessories).toContain("light_gloves");
  });

  it("long → long sleeve + tights + gloves", () => {
    expect(at7("long")).toMatchObject({ top: "light_long_sleeve", bottom: "light_tights" });
    expect(at7("long").accessories).toContain("light_gloves");
  });

  it("tempo → long sleeve + shorts", () => {
    expect(at7("tempo")).toMatchObject({ top: "light_long_sleeve", bottom: "shorts" });
  });

  it("intervals → short or long sleeve + shorts", () => {
    const r = at7("intervals");
    expect(["short_sleeve", "light_long_sleeve"]).toContain(r.top);
    expect(r.bottom).toBe("shorts");
  });

  it("clothing never increases with intensity", () => {
    const order: RunType[] = ["easy", "tempo", "intervals", "race"];
    for (const temp of [-8, -2, 3, 7, 12, 18]) {
      const scores = order.map((t) => warmth(run({ temperature: temp }, t, 60)));
      for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("race explains starting slightly cool", () => {
    expect(reasonCodes(run({ temperature: 7 }, "race"))).toContain("RACE_START_COOL");
  });
});

describe("rain", () => {
  it("small chance of drizzle → no jacket", () => {
    const rec = run({ temperature: 10, rainChance: 20, rainMm: 0.1 });
    expect(rec.outerLayer).toBeUndefined();
    expect(reasonCodes(rec)).toContain("DRY");
  });

  it("moderate showers → light layer, not a waterproof", () => {
    const rec = run({ temperature: 10, rainChance: 45, rainMm: 0.4 });
    expect(rec.outerLayer?.id).toBe("windbreaker");
    expect(reasonCodes(rec)).toContain("SHOWERS");
  });

  it("warm heavy rain → no jacket, explains why", () => {
    const rec = run({ temperature: 22, feelsLike: 23, rainChance: 90, rainMm: 5, code: 63 });
    expect(rec.outerLayer).toBeUndefined();
    expect(reasonCodes(rec)).toContain("WARM_RAIN");
  });

  it("long runs react to lower rain probabilities", () => {
    const short = run({ temperature: 10, rainChance: 35, rainMm: 0.3 }, "easy", 30);
    const long = run({ temperature: 10, rainChance: 35, rainMm: 0.3 }, "easy", 120);
    expect(short.outerLayer).toBeUndefined();
    expect(long.outerLayer?.id).toBe("windbreaker");
  });
});

describe("cold and extremes", () => {
  it("-3°C → thermal, tights, gloves, beanie, wind protection", () => {
    const r = ids(run({ temperature: -3, feelsLike: -6 }));
    expect(r.top).toBe("thermal_long_sleeve");
    expect(r.bottom).toBe("thermal_tights");
    expect(r.accessories).toEqual(expect.arrayContaining(["warm_gloves", "beanie"]));
    expect(r.outer).toBe("windbreaker");
  });

  it("-15°C → insulated jacket + severe cold warning", () => {
    const rec = run({ temperature: -15, feelsLike: -22 });
    expect(rec.outerLayer?.id).toBe("insulated_jacket");
    expect(rec.socks.id).toBe("heavy_socks");
    expect(rec.warnings[0].code).toBe("EXTREME_COLD");
    expect(rec.warnings[0].severity).toBe("danger");
  });

  it("extreme heat → danger warning", () => {
    expect(warningCodes(run({ temperature: 34, feelsLike: 37 }))).toContain("EXTREME_HEAT");
  });

  it("thunderstorm → danger warning first", () => {
    const rec = run({ temperature: 20, feelsLike: 20, rainChance: 80, rainMm: 4, code: 95 });
    expect(rec.warnings[0]).toMatchObject({ code: "THUNDERSTORM", severity: "danger" });
  });

  it("dangerous gusts → danger warning", () => {
    expect(warningCodes(run({ temperature: 10, wind: 45, gust: 85 }))).toContain("DANGEROUS_WIND");
  });

  it("darkness → info warning", () => {
    expect(warningCodes(run({ temperature: 10, isDay: false }))).toContain("DARKNESS");
  });
});

describe("determinism and explanations", () => {
  it("returns identical output for identical input", () => {
    const a = run({ temperature: 6, wind: 20, rainChance: 50, rainMm: 1 }, "long", 90, "cold");
    const b = run({ temperature: 6, wind: 20, rainChance: 50, rainMm: 1 }, "long", 90, "cold");
    expect(a).toEqual(b);
  });

  it("every reason and warning renders to non-empty text", () => {
    const cases = [
      run({ temperature: 8 }, "tempo", 60),
      run({ temperature: 2, feelsLike: -3, wind: 30, gust: 50 }, "long", 120, "cold"),
      run({ temperature: 25, feelsLike: 26, uv: 7, cloud: 10 }, "race", 30, "hot"),
      run({ temperature: 10, rainChance: 90, rainMm: 6, code: 63 }, "intervals"),
      run({ temperature: 22, rainChance: 90, rainMm: 6, code: 95, isDay: false }),
    ];
    for (const rec of cases) {
      expect(rec.reasons.length).toBeGreaterThan(0);
      for (const r of rec.reasons) expect(describeReason(r).length).toBeGreaterThan(10);
      for (const w of rec.warnings) {
        const t = describeWarning(w);
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.body.length).toBeGreaterThan(10);
      }
    }
  });

  it("tempo explanation mentions body heat", () => {
    const rec = run({ temperature: 8, wind: 18 }, "tempo", 60);
    expect(describeReason(rec.reasons[0])).toMatch(/60-minute tempo run.*body heat/);
  });
});
