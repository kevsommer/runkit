import { useMemo } from "react";
import { recommendOutfit } from "./recommendation/engine";
import type { OutfitRecommendation, RunInput, RunWeather } from "./recommendation/types";
import { NoForecastError, summarizeRunWeather } from "./weather/runWindow";
import type { State } from "./store";

export type RunResult =
  | { status: "unavailable"; reason: "no-weather" | "no-forecast" }
  | {
      status: "ready";
      startMs: number;
      endMs: number;
      input: RunInput;
      runWeather: RunWeather;
      recommendation: OutfitRecommendation;
    };

/** Pure derivation of the outfit from store state. */
export function computeRunResult(state: State): RunResult {
  const { weather, run, settings, now } = state;
  if (!weather || !now) return { status: "unavailable", reason: "no-weather" };
  const startMs = run.start === "now" ? now : run.start;
  const input: RunInput = {
    durationMinutes: run.durationMinutes,
    runType: run.runType,
    startTime: new Date(startMs).toISOString(),
    temperaturePreference: settings.temperaturePreference,
  };
  try {
    const runWeather = summarizeRunWeather(weather, startMs, run.durationMinutes);
    return {
      status: "ready",
      startMs,
      endMs: startMs + run.durationMinutes * 60_000,
      input,
      runWeather,
      recommendation: recommendOutfit(input, runWeather),
    };
  } catch (err) {
    if (err instanceof NoForecastError) return { status: "unavailable", reason: "no-forecast" };
    throw err;
  }
}

export function useRunResult(state: State): RunResult {
  const { weather, run, settings, now } = state;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeRunResult(state), [weather, run, settings.temperaturePreference, now]);
}
