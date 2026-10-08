import { conditionEmoji, conditionLabel } from "@/lib/weather/conditions";
import { formatTemp, formatTime, formatWind, formatWindRange } from "@/lib/format";
import type { RunWeather } from "@/lib/recommendation/types";
import type { WeatherData } from "@/lib/weather/types";
import type { Settings } from "@/lib/store";

const HOUR = 3_600_000;

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background px-3.5 py-3">
      <span aria-hidden className="text-lg">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-[15px] font-semibold leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function WeatherTimeline({
  weather,
  runWeather,
  startMs,
  endMs,
  settings,
}: {
  weather: WeatherData;
  runWeather: RunWeather;
  startMs: number;
  endMs: number;
  settings: Settings;
}) {
  const t = settings.tempUnit;
  const w = runWeather;
  const tz = weather.timezone;
  const hours = weather.hourly.filter(
    (h) => h.time >= Math.floor(startMs / HOUR) * HOUR && h.time <= Math.ceil(endMs / HOUR) * HOUR,
  );
  const humidity =
    w.humidityMin !== undefined && w.humidityMax !== undefined
      ? Math.round(w.humidityMin) === Math.round(w.humidityMax)
        ? `${Math.round(w.humidityMin)}%`
        : `${Math.round(w.humidityMin)}–${Math.round(w.humidityMax)}%`
      : "—";
  const c = weather.current;

  return (
    <section aria-labelledby="during-run" className="rounded-3xl border border-border bg-card p-5">
      <h2 id="during-run" className="eyebrow">
        Weather during your run
      </h2>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {formatTemp(w.start.temperature, t)} <span className="text-muted">→</span> {formatTemp(w.end.temperature, t)}
      </p>
      <p className="text-sm text-muted">
        {conditionLabel(w.weatherCode)} · feels like {formatTemp(w.feelsLikeMin, t)}
        {Math.round(w.feelsLikeMin) !== Math.round(w.feelsLikeMax) && `–${formatTemp(w.feelsLikeMax, t)}`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat icon="💨" label="Wind" value={formatWindRange(w.windSpeedMin, w.windSpeedMax, settings.windUnit)} />
        <Stat icon="🌧️" label="Rain chance" value={`${Math.round(w.precipitationProbabilityMax)}%`} />
        <Stat icon="💧" label="Humidity" value={humidity} />
        <Stat
          icon="🌬️"
          label="Gusts"
          value={w.windGustMax !== undefined ? `up to ${formatWind(w.windGustMax, settings.windUnit)}` : "—"}
        />
      </div>

      {hours.length > 1 && (
        <div className="no-scrollbar -mx-5 mt-4 overflow-x-auto px-5">
          <ol className="flex gap-2" aria-label="Hourly forecast">
            {hours.map((h) => (
              <li
                key={h.time}
                className="flex min-w-16 flex-col items-center gap-1 rounded-2xl border border-border px-2 py-2.5 text-center"
              >
                <span className="text-xs text-muted">{formatTime(h.time, tz)}</span>
                <span aria-label={h.condition} role="img" className="text-lg">
                  {conditionEmoji(h.weatherCode, h.isDay)}
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatTemp(h.temperature, t)}</span>
                <span className="text-[11px] text-muted tabular-nums">
                  <span className="sr-only">Rain chance </span>
                  {Math.round(h.precipitationProbability)}%
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted">Right now</span>
        <span className="font-medium tabular-nums">
          {formatTemp(c.temperature, t)} · feels like {formatTemp(c.feelsLike, t)}
        </span>
      </div>
    </section>
  );
}
