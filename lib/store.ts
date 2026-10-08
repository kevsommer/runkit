import { useSyncExternalStore } from "react";
import type { RunType, TemperaturePreference } from "./recommendation/types";
import type { GeoLocation, WeatherData } from "./weather/types";

export type TempUnit = "C" | "F";
export type WindUnit = "kmh" | "mph" | "ms";
export type Theme = "system" | "light" | "dark";

export type Settings = {
  temperaturePreference: TemperaturePreference;
  tempUnit: TempUnit;
  windUnit: WindUnit;
  defaultDuration: number;
  defaultRunType: RunType;
  theme: Theme;
};

export type RunPlan = {
  durationMinutes: number;
  runType: RunType;
  /** "now" or a planned start (epoch ms). */
  start: "now" | number;
};

export type WeatherError = "offline" | "unavailable" | "invalid_location";
export type LocationStatus = "idle" | "locating" | "denied" | "unavailable";

export type State = {
  /** False during server render and hydration. */
  hydrated: boolean;
  /** Wall clock (epoch ms), ticked every minute so renders stay pure. */
  now: number;
  online: boolean;
  settings: Settings;
  run: RunPlan;
  location: GeoLocation | null;
  weather: WeatherData | null;
  weatherStatus: "idle" | "loading" | "error";
  weatherError: WeatherError | null;
  locationStatus: LocationStatus;
};

const STORAGE_KEY = "runkit:v1";
/** Refetch weather older than this. */
export const REFRESH_AFTER_MS = 10 * 60_000;

export const DEFAULT_SETTINGS: Settings = {
  temperaturePreference: "normal",
  tempUnit: "C",
  windUnit: "kmh",
  defaultDuration: 45,
  defaultRunType: "easy",
  theme: "system",
};

const SERVER_STATE: State = {
  hydrated: false,
  now: 0,
  online: true,
  settings: DEFAULT_SETTINGS,
  run: { durationMinutes: DEFAULT_SETTINGS.defaultDuration, runType: DEFAULT_SETTINGS.defaultRunType, start: "now" },
  location: null,
  weather: null,
  weatherStatus: "idle",
  weatherError: null,
  locationStatus: "idle",
};

type Persisted = {
  settings?: Partial<Settings>;
  location?: GeoLocation | null;
  weather?: WeatherData | null;
  weatherKey?: string;
};

const locationKey = (l: { latitude: number; longitude: number }) =>
  `${l.latitude.toFixed(3)},${l.longitude.toFixed(3)}`;

let state: State = SERVER_STATE;
let loaded = false;
let started = false;
const listeners = new Set<() => void>();

function readStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    const p: Persisted = {
      settings: state.settings,
      location: state.location,
      weather: state.weather,
      weatherKey: state.location ? locationKey(state.location) : undefined,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage full or blocked — the app still works for this session.
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const p = readStorage();
  const settings = { ...DEFAULT_SETTINGS, ...p.settings };
  const location = p.location ?? null;
  const weather =
    location && p.weather && p.weatherKey === locationKey(location) ? p.weather : null;
  state = {
    ...SERVER_STATE,
    hydrated: true,
    now: Date.now(),
    online: navigator.onLine,
    settings,
    run: { durationMinutes: settings.defaultDuration, runType: settings.defaultRunType, start: "now" },
    location,
    weather,
  };
}

function setState(patch: Partial<State>, save = false) {
  state = { ...state, ...patch };
  if (save) persist();
  listeners.forEach((l) => l());
}

function applyTheme() {
  const t = state.settings.theme;
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** Side effects that run once the first component subscribes in the browser. */
function start() {
  if (started) return;
  started = true;
  applyTheme();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  window.addEventListener("online", () => {
    setState({ online: true });
    refreshIfStale();
  });
  window.addEventListener("offline", () => setState({ online: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      tick();
      refreshIfStale();
    }
  });
  setInterval(tick, 60_000);
  refreshIfStale();
}

function tick() {
  const now = Date.now();
  // Drop planned starts that have passed.
  const run = typeof state.run.start === "number" && state.run.start < now - 30 * 60_000
    ? { ...state.run, start: "now" as const }
    : state.run;
  setState({ now, run });
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  load();
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

/* ---------------- Actions ---------------- */

export async function refreshWeather() {
  const loc = state.location;
  if (!loc || state.weatherStatus === "loading") return;
  setState({ weatherStatus: "loading", weatherError: null });
  try {
    const res = await fetch(`/api/weather?lat=${loc.latitude}&lon=${loc.longitude}`, { cache: "no-store" });
    if (!res.ok) {
      setState({ weatherStatus: "error", weatherError: res.status === 400 ? "invalid_location" : "unavailable" });
      return;
    }
    const weather = (await res.json()) as WeatherData;
    // Ignore if the location changed while we were fetching.
    if (state.location !== loc) return;
    setState({ weather, weatherStatus: "idle", weatherError: null, now: Date.now() }, true);
  } catch {
    setState({ weatherStatus: "error", weatherError: navigator.onLine ? "unavailable" : "offline" });
  }
}

export function refreshIfStale() {
  if (!state.location) return;
  const age = state.weather ? Date.now() - state.weather.fetchedAt : Infinity;
  if (age > REFRESH_AFTER_MS) refreshWeather();
}

export function setLocation(location: GeoLocation) {
  const sameSpot = state.location && locationKey(state.location) === locationKey(location);
  setState(
    {
      location,
      weather: sameSpot ? state.weather : null,
      weatherStatus: "idle",
      weatherError: null,
      locationStatus: "idle",
    },
    true,
  );
  refreshWeather();
}

export function locateMe() {
  if (!("geolocation" in navigator)) {
    setState({ locationStatus: "unavailable" });
    return;
  }
  setState({ locationStatus: "locating" });
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      let location: GeoLocation = { name: "Current location", latitude, longitude, source: "gps" };
      try {
        const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
        const body = (await res.json()) as { location: GeoLocation | null };
        if (body.location) location = body.location;
      } catch {
        // Keep the generic name; weather still works.
      }
      setLocation(location);
    },
    (err) => {
      setState({ locationStatus: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" });
    },
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
  );
}

export function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch };
  const run = { ...state.run };
  if (patch.defaultDuration !== undefined) run.durationMinutes = patch.defaultDuration;
  if (patch.defaultRunType !== undefined) run.runType = patch.defaultRunType;
  setState({ settings, run }, true);
  if (patch.theme) applyTheme();
}

export function updateRun(patch: Partial<RunPlan>) {
  setState({ run: { ...state.run, ...patch } });
}
