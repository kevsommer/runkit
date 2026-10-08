"use client";

import { useState } from "react";
import ChipGroup, { type ChipOption } from "./ChipGroup";
import { PencilIcon } from "./Icons";
import type { RunType, TemperaturePreference } from "@/lib/recommendation/types";
import { dayKey, formatTime } from "@/lib/format";
import type { RunPlan } from "@/lib/store";

export const RUN_TYPES: ChipOption<RunType>[] = [
  { value: "easy", label: "Easy" },
  { value: "tempo", label: "Tempo" },
  { value: "intervals", label: "Intervals" },
  { value: "long", label: "Long" },
  { value: "race", label: "Race" },
];

export const DURATIONS = [30, 45, 60, 90, 120];

export const PREFERENCES: ChipOption<TemperaturePreference>[] = [
  { value: "cold", label: "Cold", ariaLabel: "I get cold easily" },
  { value: "normal", label: "Normal" },
  { value: "hot", label: "Hot", ariaLabel: "I run hot" },
];

export function RunSelector({ value, onChange, legend = "What kind of run?" }: {
  value: RunType;
  onChange: (v: RunType) => void;
  legend?: string;
}) {
  return <ChipGroup legend={legend} options={RUN_TYPES} value={value} onChange={onChange} fill />;
}

export function TemperaturePreferenceSelector({ value, onChange, legend = "I usually feel" }: {
  value: TemperaturePreference;
  onChange: (v: TemperaturePreference) => void;
  legend?: string;
}) {
  return <ChipGroup legend={legend} options={PREFERENCES} value={value} onChange={onChange} />;
}

const DURATION_LABEL: Record<number, string> = { 60: "1h", 90: "1,5h", 120: "2h+" };
const durationLabel = (m: number) => DURATION_LABEL[m] ?? `${m}m`;

export function DurationSelector({ value, onChange, legend = "How long?" }: {
  value: number;
  onChange: (v: number) => void;
  legend?: string;
}) {
  const isPreset = DURATIONS.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const options: ChipOption<number>[] = [
    ...DURATIONS.map((m) => ({ value: m, label: durationLabel(m), ariaLabel: `${m} minutes` })),
    { value: -1, label: "Custom", ariaLabel: "Custom duration", icon: <PencilIcon /> },
  ];
  return (
    <div>
      <ChipGroup
        legend={legend}
        options={options}
        value={custom ? -1 : value}
        fill
        onChange={(v) => {
          if (v === -1) {
            setCustom(true);
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      />
      {custom && (
        <label className="rk-rise mt-3 flex items-center gap-3 text-sm">
          <span className="text-muted">Minutes</span>
          <input
            type="number"
            inputMode="numeric"
            min={5}
            max={360}
            step={5}
            value={value}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              if (Number.isFinite(n) && n >= 5 && n <= 360) onChange(n);
            }}
            className="h-11 w-24 rounded-xl border border-border bg-chip px-3 text-base font-medium focus-visible:outline-2 focus-visible:outline-accent"
          />
        </label>
      )}
    </div>
  );
}

const HOUR = 3_600_000;

/** "Now" plus the next full hours the forecast covers. */
export function StartTimeSelector({
  value,
  onChange,
  now,
  timeZone,
  latestStart,
}: {
  value: RunPlan["start"];
  onChange: (v: RunPlan["start"]) => void;
  now: number;
  timeZone?: string;
  /** Last start time that still leaves forecast for the whole run. */
  latestStart: number;
}) {
  const today = dayKey(now, timeZone);
  const tomorrow = dayKey(now + 24 * HOUR, timeZone);
  const first = Math.ceil(now / HOUR) * HOUR + (Math.ceil(now / HOUR) * HOUR - now < 15 * 60_000 ? HOUR : 0);
  const options: ChipOption<string>[] = [{ value: "now", label: "Now" }];
  for (let t = first; t <= Math.min(latestStart, now + 36 * HOUR); t += HOUR) {
    const d = dayKey(t, timeZone);
    options.push({
      value: String(t),
      label: formatTime(t, timeZone),
      sub: d === today ? undefined : d === tomorrow ? "Tomorrow" : undefined,
    });
  }
  // Keep a previously chosen start visible even if it isn't on the hour.
  if (value !== "now" && !options.some((o) => o.value === String(value))) {
    options.splice(1, 0, { value: String(value), label: formatTime(value, timeZone) });
  }
  return (
    <ChipGroup
      legend="When are you running?"
      options={options}
      value={value === "now" ? "now" : String(value)}
      onChange={(v) => onChange(v === "now" ? "now" : Number(v))}
      scroll
    />
  );
}
