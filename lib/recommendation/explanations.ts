import type { Reason, RunType, Warning } from "./types";

/** Unit-aware formatting supplied by the caller (engine data is metric). */
export type Formatters = {
  temp: (celsius: number) => string;
  wind: (kmh: number) => string;
};

export const metricFormatters: Formatters = {
  temp: (c) => `${Math.round(c)}°C`,
  wind: (k) => `${Math.round(k)} km/h`,
};

export const RUN_TYPE_LABEL: Record<RunType, string> = {
  easy: "easy",
  long: "long",
  tempo: "tempo",
  intervals: "interval",
  race: "race",
};

const lower = (s: string | number) => String(s).toLowerCase();
const n = (v: string | number | undefined) => Number(v ?? 0);

function runPhrase(p: Reason["params"]): string {
  return `a ${p.duration}-minute ${RUN_TYPE_LABEL[p.runType as RunType]} run`;
}

export function describeReason(r: Reason, f: Formatters = metricFormatters): string {
  const p = r.params;
  switch (r.code) {
    case "LOW_INTENSITY":
      return p.runType === "long"
        ? `You chose ${runPhrase(p)}. Long runs are usually easy-paced, and you'll gradually cool as the miles add up, so we've dressed you for steady effort rather than a hard session.`
        : `You chose ${runPhrase(p)}. Easy running generates relatively little body heat, so you'll feel the conditions more than on a hard session — we've factored that in.`;
    case "HIGH_INTENSITY":
      return `You chose ${runPhrase(p)}. Tempo running generates much more body heat than an easy run, so we've kept the outfit relatively light.`;
    case "INTERVALS":
      return `You chose ${runPhrase(p)}. Hard efforts heat you up fast, so we've kept things light — but not so light that you'll get chilled during recoveries.`;
    case "RACE_START_COOL":
      return `You chose ${runPhrase(p)}. Racing generates a lot of heat, so we've kept clothing minimal. Many runners deliberately start a race slightly cool — you'll warm up within the first kilometre.`;
    case "HIGH_TEMPERATURE":
      return `At ${f.temp(n(p.temperature))} (feels like ${f.temp(n(p.feelsLike))}), a ${lower(p.top)} and ${lower(p.bottom)} will keep you as cool as possible.`;
    case "MILD_TEMPERATURE":
      return `At ${f.temp(n(p.temperature))}, feeling like ${f.temp(n(p.feelsLike))}, a ${lower(p.top)} with ${lower(p.bottom)} should keep you comfortable once you've warmed up, without overheating.`;
    case "LOW_TEMPERATURE":
      return `At ${f.temp(n(p.temperature))}, feeling like ${f.temp(n(p.feelsLike))}, a ${lower(p.top)} and ${lower(p.bottom)} will hold in warmth while still letting you move freely.`;
    case "EXTREMITIES":
      return `Hands, head and neck lose heat fast, so we've added: ${lower(p.items)}. They're easy to tuck away if you warm up.`;
    case "COLD_PREFERENCE":
      return "You told us you get cold easily, so we've leaned slightly warmer.";
    case "HOT_PREFERENCE":
      return "You told us you run hot, so we've leaned slightly lighter.";
    case "LONG_DURATION":
      return `At ${p.duration} minutes you'll be out long enough for conditions to shift, so we've planned for the cooler parts of your run${p.feelsLikeMin !== undefined ? ` (down to a feels-like ${f.temp(n(p.feelsLikeMin))})` : ""}.`;
    case "HIGH_WIND":
      return p.layer
        ? `The ${f.wind(n(p.wind))} wind${n(p.gust) > n(p.wind) ? ` (gusting ${f.wind(n(p.gust))})` : ""} will make exposed skin feel substantially colder, so we've added a ${lower(p.layer)}.`
        : `The ${f.wind(n(p.wind))} wind${n(p.gust) > n(p.wind) ? ` (gusting ${f.wind(n(p.gust))})` : ""} will make it feel colder than the thermometer says — we've factored that in.`;
    case "RAIN":
      return `Rain is likely (${p.probability}% chance${n(p.amount) > 0 ? `, around ${p.amount} mm` : ""}). A waterproof shell will keep you drier — and staying dry keeps you warmer.`;
    case "SHOWERS":
      return `There's a ${p.probability}% chance of showers. Your ${lower(p.layer)} gives you some water resistance without the sweatiness of a full rain jacket.`;
    case "WARM_RAIN":
      return `There's a ${p.probability}% chance of rain, but it's warm enough that a jacket would just trap heat. You'll dry off quickly.`;
    case "DRY":
      return n(p.probability) > 0
        ? `Rain chance is only ${p.probability}%, so you don't need a rain jacket.`
        : "The weather stays dry, so you don't need a rain jacket.";
    case "SUN":
      return `UV index reaches ${p.uv} with plenty of sun, so a cap and sunglasses are worth it.`;
  }
}

export type WarningText = { title: string; body: string };

export function describeWarning(w: Warning, f: Formatters = metricFormatters): WarningText {
  const p = w.params;
  switch (w.code) {
    case "THUNDERSTORM":
      return {
        title: "Thunderstorms forecast",
        body: "Lightning is dangerous for runners. Consider moving your run indoors or waiting until the storm passes.",
      };
    case "EXTREME_HEAT":
      return {
        title: "Extreme heat",
        body: `Feels like up to ${f.temp(n(p.feelsLike))}. Extreme heat can be dangerous — consider changing the timing or duration of your run, and carry water.`,
      };
    case "HEAT":
      return {
        title: "Warm for running",
        body:
          n(p.duration) >= 45
            ? "Keep clothing minimal, slow your pace a little, and carry water on a run this long."
            : "Keep clothing minimal and ease off the pace if you feel overheated.",
      };
    case "EXTREME_COLD":
      return {
        title: "Severe cold",
        body: `Feels like ${f.temp(n(p.feelsLike))}. Cover exposed skin, consider a shorter loop close to home, or run indoors.`,
      };
    case "DANGEROUS_WIND":
      return {
        title: "Dangerous wind",
        body: `Gusts up to ${f.wind(n(p.gust))}. Watch for falling branches and debris — consider postponing or choosing a sheltered route.`,
      };
    case "STRONG_WIND":
      return {
        title: "Strong wind",
        body: "Strong wind will make the temperature feel colder, especially on exposed sections. Start into the wind so it's at your back on the way home.",
      };
    case "ICE":
      return {
        title: "Possible ice",
        body: "Wet surfaces near freezing can be slippery. Shorten your stride and take corners carefully.",
      };
    case "SNOW":
      return { title: "Snow", body: "Expect slippery footing. Trail shoes or extra grip help." };
    case "RAIN_TIMING":
      return {
        title: "Rain",
        body:
          p.phase === "throughout"
            ? "Rain is likely throughout your run."
            : p.phase === "second_half"
              ? "Rain is likely during the second half of your run."
              : "Rain is likely early in your run.",
      };
    case "TEMPERATURE_DROP":
      return {
        title: "Cooling down",
        body: `Temperatures are expected to drop from ${f.temp(n(p.from))} to ${f.temp(n(p.to))} during your run.`,
      };
    case "TEMPERATURE_RISE":
      return {
        title: "Warming up",
        body: `Temperatures are expected to rise from ${f.temp(n(p.from))} to ${f.temp(n(p.to))} during your run.`,
      };
    case "COLD_START":
      return {
        title: "Chilly start",
        body: "You'll probably feel cold for the first few minutes. That's normal — you'll warm up within about 10 minutes.",
      };
    case "HIGH_UV":
      return { title: `High UV (${p.uv})`, body: "Wear sunscreen on exposed skin." };
    case "FOG":
      return { title: "Fog", body: "Visibility is reduced. Wear something bright and take care crossing roads." };
    case "DARKNESS":
      return {
        title: "Running in the dark",
        body: "Part of your run is after dark. Wear something bright or reflective, and consider a light.",
      };
  }
}
