"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HomeHeader, Splash, pageShell, primaryButton } from "@/components/AppChrome";
import LocationSheet, { LocationSearch } from "@/components/LocationSheet";
import ResultView from "@/components/ResultView";
import {
  DurationSelector,
  RunSelector,
  StartTimeSelector,
  TemperaturePreferenceSelector,
} from "@/components/RunSelectors";
import WeatherCard, { LocationButton, WeatherLoading } from "@/components/WeatherCard";
import { updateRun, updateSettings, useStore, type State } from "@/lib/store";
import { useRunResult, type RunResult } from "@/lib/useRunResult";
import { forecastEnd } from "@/lib/weather/runWindow";

function Onboarding({ state }: { state: State }) {
  return (
    <section className="rk-rise mt-10 flex flex-col gap-6" aria-labelledby="onboarding-title">
      <div>
        <h1 id="onboarding-title" className="text-3xl font-semibold leading-tight tracking-tight">
          I&apos;m going for a run.
          <br />
          <span className="text-muted">What should I wear?</span>
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          Use your location to get the weather for your run. It stays on your device — no account needed.
        </p>
      </div>
      <LocationSearch locationStatus={state.locationStatus} />
    </section>
  );
}

function ResultPanel({ state, result }: { state: State; result: RunResult }) {
  if (result.status === "ready") return <ResultView state={state} result={result} layout="panel" />;
  if (!state.weather) return <WeatherLoading />;
  return <NoForecast />;
}

function NoForecast() {
  return (
    <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted" role="status">
      There&apos;s no forecast available for that time yet. Try an earlier start or a shorter run.
    </p>
  );
}

export default function Home() {
  const state = useStore();
  const result = useRunResult(state);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!state.hydrated) {
    return (
      <main className={pageShell}>
        <Splash />
      </main>
    );
  }

  if (!state.location) {
    return (
      <main className={pageShell}>
        <div className="mx-auto w-full max-w-xl">
          <HomeHeader />
          <Onboarding state={state} />
        </div>
      </main>
    );
  }

  const { run, settings, weather, now } = state;
  const latestStart = weather ? forecastEnd(weather) - run.durationMinutes * 60_000 : now;

  return (
    <main className={`${pageShell} lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-14`}>
      <div className="flex flex-col gap-5 pb-14 lg:gap-7 lg:pb-0">
        <HomeHeader />

        <section aria-label="Current weather" className="flex flex-col gap-2 lg:gap-3">
          <LocationButton state={state} onClick={() => setSheetOpen(true)} />
          <WeatherCard state={state} />
        </section>

        <form
          className="flex flex-col gap-5 lg:gap-7"
          onSubmit={(e) => {
            e.preventDefault();
            router.push("/result");
          }}
          aria-label="Your run"
        >
          {weather && (
            <StartTimeSelector
              value={run.start}
              onChange={(start) => updateRun({ start })}
              now={now}
              timeZone={weather.timezone}
              latestStart={latestStart}
            />
          )}
          <DurationSelector value={run.durationMinutes} onChange={(durationMinutes) => updateRun({ durationMinutes })} />
          <RunSelector value={run.runType} onChange={(runType) => updateRun({ runType })} />
          <TemperaturePreferenceSelector
            value={settings.temperaturePreference}
            onChange={(temperaturePreference) => updateSettings({ temperaturePreference })}
          />
          {result.status === "unavailable" && result.reason === "no-forecast" && <NoForecast />}

          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/85 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
            <button type="submit" disabled={result.status !== "ready"} className={`${primaryButton} mx-auto max-w-xl`}>
              WHAT SHOULD I WEAR?
            </button>
          </div>
        </form>
      </div>

      <aside className="hidden lg:block" aria-label="Recommendation">
        <div className="sticky top-6 pt-14">
          <ResultPanel state={state} result={result} />
        </div>
      </aside>

      <LocationSheet open={sheetOpen} onClose={() => setSheetOpen(false)} locationStatus={state.locationStatus} />
    </main>
  );
}
