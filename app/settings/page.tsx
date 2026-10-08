"use client";

import { useState } from "react";
import { BackHeader, Splash, pageShell } from "@/components/AppChrome";
import ChipGroup from "@/components/ChipGroup";
import { PinIcon } from "@/components/Icons";
import LocationSheet from "@/components/LocationSheet";
import { DurationSelector, RunSelector, TemperaturePreferenceSelector } from "@/components/RunSelectors";
import { updateSettings, useStore, type TempUnit, type Theme, type WindUnit } from "@/lib/store";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border py-5 last:border-b-0">{children}</div>;
}

export default function SettingsPage() {
  const state = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { settings, location } = state;

  return (
    <main className={pageShell}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
        <BackHeader title="Settings" />
        {!state.hydrated ? (
          <Splash />
        ) : (
          <div className="rk-rise rounded-3xl border border-border bg-card px-5">
            <Row>
              <p className="eyebrow mb-2.5">Location</p>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <PinIcon className="size-4 shrink-0 text-accent" />
                  <span className="truncate">{location?.name ?? "Not set"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="h-10 shrink-0 rounded-xl border border-border px-4 text-sm font-semibold transition hover:border-muted focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Change
                </button>
              </div>
            </Row>
            <Row>
              <TemperaturePreferenceSelector
                legend="Temperature preference"
                value={settings.temperaturePreference}
                onChange={(temperaturePreference) => updateSettings({ temperaturePreference })}
              />
            </Row>
            <Row>
              <ChipGroup<TempUnit>
                legend="Temperature units"
                options={[
                  { value: "C", label: "Celsius" },
                  { value: "F", label: "Fahrenheit" },
                ]}
                value={settings.tempUnit}
                onChange={(tempUnit) => updateSettings({ tempUnit })}
              />
            </Row>
            <Row>
              <ChipGroup<WindUnit>
                legend="Wind units"
                options={[
                  { value: "kmh", label: "km/h" },
                  { value: "mph", label: "mph" },
                  { value: "ms", label: "m/s" },
                ]}
                value={settings.windUnit}
                onChange={(windUnit) => updateSettings({ windUnit })}
              />
            </Row>
            <Row>
              <DurationSelector
                legend="Default run duration"
                value={settings.defaultDuration}
                onChange={(defaultDuration) => updateSettings({ defaultDuration })}
              />
            </Row>
            <Row>
              <RunSelector
                legend="Default run type"
                value={settings.defaultRunType}
                onChange={(defaultRunType) => updateSettings({ defaultRunType })}
              />
            </Row>
            <Row>
              <ChipGroup<Theme>
                legend="Theme"
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
              />
            </Row>
          </div>
        )}
        <p className="mt-4 px-1 text-xs leading-relaxed text-muted">
          Settings are saved on this device. RunKit has no accounts and doesn&apos;t track you. Weather data from
          Open-Meteo. RunKit is a guide, not a safety authority — in extreme conditions, use your judgement.
        </p>
      </div>
      <LocationSheet open={sheetOpen} onClose={() => setSheetOpen(false)} locationStatus={state.locationStatus} />
    </main>
  );
}
