"use client";

import { ChevronDownIcon, PinIcon, RefreshIcon } from "./Icons";
import { conditionEmoji } from "@/lib/weather/conditions";
import { formatAge, formatTemp, formatWind } from "@/lib/format";
import { refreshWeather, REFRESH_AFTER_MS, type State } from "@/lib/store";

const ERROR_TEXT = {
  offline: "You're offline.",
  unavailable: "We couldn't get the latest weather right now.",
  invalid_location: "We couldn't find weather for this location.",
} as const;

export function LocationButton({ state, onClick }: { state: State; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 flex max-w-full items-center gap-1.5 rounded-xl px-2 py-1 text-left transition hover:bg-card focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={`Location: ${state.location?.name ?? "not set"}. Change location`}
    >
      <PinIcon className="size-4 shrink-0 text-accent" />
      <span className="truncate text-lg font-semibold tracking-tight">{state.location?.name ?? "Set location"}</span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted" />
    </button>
  );
}

/** "Updated 42 minutes ago" — shown whenever the data isn't fresh. */
export function StaleNotice({ state, className = "" }: { state: State; className?: string }) {
  const { weather, weatherStatus, weatherError, online, now } = state;
  if (!weather) return null;
  const age = now - weather.fetchedAt;
  const stale = age > REFRESH_AFTER_MS || !online || weatherStatus === "error";
  if (!stale && weatherStatus !== "loading") return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className}`} role="status">
      {weatherStatus === "loading" ? (
        <span className="text-muted">Updating weather…</span>
      ) : (
        <span className={weatherError || !online ? "text-caution" : "text-muted"}>
          {weatherError ? `${ERROR_TEXT[weatherError]} ` : !online ? "Offline. " : ""}
          {weatherError || !online ? "Showing weather from " : "Weather updated "}
          {formatAge(age)}.
        </span>
      )}
      {online && weatherStatus !== "loading" && (
        <button
          type="button"
          onClick={() => refreshWeather()}
          className="inline-flex items-center gap-1 font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <RefreshIcon className="size-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function WeatherLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center" role="status">
      <span className="animate-pulse text-4xl motion-reduce:animate-none" aria-hidden>
        🌤️
      </span>
      <p className="text-sm text-muted">Checking the weather…</p>
    </div>
  );
}

export function WeatherError({ state }: { state: State }) {
  return (
    <div className="flex flex-col items-start gap-3 py-4" role="alert">
      <p className="font-medium">{ERROR_TEXT[state.weatherError ?? "unavailable"]}</p>
      {state.weatherError === "offline" && (
        <p className="text-sm text-muted">Connect to the internet to get the forecast for your run.</p>
      )}
      <button
        type="button"
        onClick={() => refreshWeather()}
        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <RefreshIcon /> Try again
      </button>
    </div>
  );
}

export default function WeatherCard({ state }: { state: State }) {
  const { weather, settings, weatherStatus } = state;

  if (!weather) {
    return weatherStatus === "error" ? <WeatherError state={state} /> : <WeatherLoading />;
  }

  const c = weather.current;
  const t = settings.tempUnit;
  return (
    <div className="rk-rise">
      <p className="eyebrow">Right now</p>
      <div className="mt-1 flex items-end gap-4">
        <span className="text-7xl font-semibold leading-none tracking-tighter tabular-nums">
          {formatTemp(c.temperature, t)}
        </span>
        <div className="pb-1.5">
          <p className="text-sm text-muted">Feels like</p>
          <p className="text-xl font-semibold tabular-nums">{formatTemp(c.feelsLike, t)}</p>
        </div>
        <span className="ml-auto pb-1 text-5xl" aria-hidden>
          {conditionEmoji(c.weatherCode, c.isDay)}
        </span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <li className="font-medium text-foreground">{c.condition}</li>
        <li>
          <span aria-hidden>💨 </span>
          <span className="sr-only">Wind </span>
          {formatWind(c.windSpeed, settings.windUnit)}
        </li>
        {c.humidity !== undefined && (
          <li>
            <span aria-hidden>💧 </span>
            <span className="sr-only">Humidity </span>
            {Math.round(c.humidity)}%
          </li>
        )}
      </ul>
      <StaleNotice state={state} className="mt-3" />
    </div>
  );
}
