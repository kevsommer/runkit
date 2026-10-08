"use client";

import { useMemo } from "react";
import ExplanationCard, { WarningList } from "./ExplanationCard";
import OutfitCard from "./OutfitCard";
import WeatherTimeline from "./WeatherTimeline";
import { StaleNotice } from "./WeatherCard";
import { RUN_TYPE_LABEL } from "@/lib/recommendation/explanations";
import { formatDuration, formatTemp, formatTime, formatters } from "@/lib/format";
import type { State } from "@/lib/store";
import type { RunResult } from "@/lib/useRunResult";

type Ready = Extract<RunResult, { status: "ready" }>;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "12°", or "12° → 9°" when it changes during the run. */
function TempRange({ from, to, unit }: { from: number; to: number; unit: State["settings"]["tempUnit"] }) {
  return (
    <>
      {formatTemp(from, unit)}
      {Math.round(from) !== Math.round(to) && (
        <>
          {" "}
          <span className="text-muted" aria-label="to">→</span> {formatTemp(to, unit)}
        </>
      )}
    </>
  );
}

export default function ResultView({ state, result, layout = "page" }: { state: State; result: Ready; layout?: "page" | "panel" }) {
  const { settings, weather, location } = state;
  const { recommendation: rec, runWeather: rw, startMs, endMs, input } = result;
  const fmt = useMemo(() => formatters(settings.tempUnit, settings.windUnit), [settings.tempUnit, settings.windUnit]);
  if (!weather) return null;

  const tz = weather.timezone;
  const danger = rec.warnings.filter((w) => w.severity === "danger");
  const notes = rec.warnings.filter((w) => w.severity !== "danger");
  const wide = layout === "page";

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Your run</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{location?.name}</h1>
        <div className="mt-1 flex flex-wrap items-end gap-x-5 gap-y-1">
          <p className="text-4xl font-semibold tracking-tighter tabular-nums">
            <TempRange from={rw.start.temperature} to={rw.end.temperature} unit={settings.tempUnit} />
          </p>
          <div className="pb-0.5">
            <p className="text-sm leading-tight text-muted">Feels like</p>
            <p className="text-2xl font-semibold leading-tight tracking-tight tabular-nums">
              <TempRange from={rw.start.feelsLike} to={rw.end.feelsLike} unit={settings.tempUnit} />
            </p>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">
          {formatTime(startMs, tz)}–{formatTime(endMs, tz)} · {formatDuration(input.durationMinutes)} ·{" "}
          {capitalize(RUN_TYPE_LABEL[input.runType])}
        </p>
        <StaleNotice state={state} className="mt-2" />
      </header>

      <WarningList warnings={danger} fmt={fmt} />

      <div className={wide ? "grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start" : "flex flex-col gap-6"}>
        <div className={`flex flex-col gap-6 ${wide ? "md:sticky md:top-6" : ""}`}>
          <OutfitCard recommendation={rec} />
          <WarningList warnings={notes} fmt={fmt} title="Heads up" />
        </div>
        <div className="flex flex-col gap-6">
          <ExplanationCard recommendation={rec} fmt={fmt} />
          <WeatherTimeline weather={weather} runWeather={rw} startMs={startMs} endMs={endMs} settings={settings} />
          <p className="px-1 text-xs leading-relaxed text-muted">
            RunKit is a guide, not a safety authority — everyone&apos;s tolerance differs, so adjust to how you feel.
          </p>
        </div>
      </div>
    </div>
  );
}
