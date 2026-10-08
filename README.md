# RunKit — Know what to wear.

A mobile-first PWA that tells runners what to wear for a run, based on the
forecast **during** the run, run type, duration, wind, rain and personal
temperature preference — and explains why.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # recommendation engine + run-window tests
npm run build && npm start   # production build (service worker is active in production only)
```

No API key is needed: weather comes from [Open-Meteo](https://open-meteo.com),
city search from Open-Meteo Geocoding, and reverse geocoding from
OpenStreetMap Nominatim. All calls are proxied through server routes
(`app/api/*`), so any key you add stays server-side. See `.env.example`.

## How it works

```
app/
  page.tsx                 Home: location, current weather, run setup (+ live result on desktop)
  result/page.tsx          Result: runner illustration, outfit, why, weather during run
  settings/page.tsx        Units, defaults, theme, location
  api/weather|geocode|reverse-geocode   Server-side provider proxies
  manifest.ts              Web App Manifest
components/                UI (RunnerIllustration is the layered SVG runner)
lib/
  recommendation/
    config.ts              ALL tunable thresholds live here
    rules.ts               Individual rules (comfort temp, top/bottom/outer/accessories, warnings)
    engine.ts              recommendOutfit(input, runWeather) — deterministic
    explanations.ts        Reason/warning codes → human text
    clothing.ts            Controlled clothing vocabulary
  weather/
    provider.ts            Provider selection (WeatherProvider interface in types.ts)
    openMeteo.ts           Open-Meteo implementation
    runWindow.ts           Aggregates the hourly forecast over the run window
  store.ts                 Local-only state (settings, location, cached weather)
public/sw.js               Service worker: offline shell + static asset cache
```

### The engine

The engine reduces conditions to one **comfort temperature**:

```
baseline  = 0.7 × feels-like + 0.3 × air temp   (long runs lean toward the run's coldest point)
comfort   = baseline + intensity offset + preference offset − strong-wind penalty − wet penalty
```

Each clothing choice is a threshold on that number; rain and wind independently
decide outer layers. Every decision emits reason codes (`HIGH_INTENSITY`,
`HIGH_WIND`, `RAIN`, …) that `explanations.ts` turns into text, and warnings
(heat, severe cold, thunderstorms, dangerous wind, ice, darkness, …) are
surfaced by severity.

To tune it after testing with real runners, edit `lib/recommendation/config.ts`
and run `npm test`.

### Offline

Cached weather is kept in `localStorage` and always labelled with its age
("Showing weather from 35 minutes ago"); the service worker never serves
weather API responses.

### Icons

`scripts/icon.svg` is the source; regenerate PNGs with `node scripts/generate-icons.mjs`.
