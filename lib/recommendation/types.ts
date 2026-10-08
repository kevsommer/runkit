export type RunType = "easy" | "long" | "tempo" | "intervals" | "race";
export type TemperaturePreference = "cold" | "normal" | "hot";

export type RunInput = {
  durationMinutes: number;
  runType: RunType;
  /** ISO timestamp of the planned start. */
  startTime: string;
  temperaturePreference: TemperaturePreference;
};

/** A single point-in-time weather reading. Metric units throughout. */
export type WeatherSnapshot = {
  temperature: number; // °C
  feelsLike: number; // °C
  windSpeed: number; // km/h
  windGust?: number; // km/h
  precipitationProbability: number; // 0–100
  precipitationAmount?: number; // mm
  humidity?: number; // 0–100
  cloudCover?: number; // 0–100
  uvIndex?: number;
  isDay?: boolean;
  /** WMO weather code. */
  weatherCode: number;
  condition: string;
};

/** Weather aggregated over the planned run window. Metric units throughout. */
export type RunWeather = {
  start: WeatherSnapshot;
  end: WeatherSnapshot;
  temperatureMin: number;
  temperatureMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  feelsLikeAvg: number;
  windSpeedMin: number;
  windSpeedMax: number;
  windGustMax?: number;
  precipitationProbabilityMax: number;
  /** Expected precipitation during the run, in mm. */
  precipitationTotal: number;
  /** Share of the run (0–1) where precipitation is likely. */
  wetFraction: number;
  /** Where in the run (0–1) precipitation first becomes likely, if at all. */
  rainOnset?: number;
  humidityMin?: number;
  humidityMax?: number;
  uvIndexMax?: number;
  cloudCoverAvg?: number;
  /** True if any part of the run falls outside daylight. */
  hasDarkness: boolean;
  /** Most significant WMO weather code during the run. */
  weatherCode: number;
};

export type ClothingCategory = "top" | "outer" | "bottom" | "socks" | "accessory";

export type ClothingId =
  // Tops
  | "short_sleeve"
  | "light_long_sleeve"
  | "thermal_long_sleeve"
  // Outer layers
  | "windbreaker"
  | "waterproof_shell"
  | "insulated_jacket"
  // Bottoms
  | "shorts"
  | "half_tights"
  | "light_tights"
  | "thermal_tights"
  | "running_trousers"
  // Socks
  | "light_socks"
  | "medium_socks"
  | "heavy_socks"
  // Accessories
  | "light_gloves"
  | "warm_gloves"
  | "beanie"
  | "cap"
  | "neck_gaiter"
  | "sunglasses";

export type ClothingItem = {
  id: ClothingId;
  name: string;
  category: ClothingCategory;
  emoji: string;
};

export type ReasonCode =
  | "LOW_INTENSITY"
  | "HIGH_INTENSITY"
  | "INTERVALS"
  | "RACE_START_COOL"
  | "LONG_DURATION"
  | "LOW_TEMPERATURE"
  | "MILD_TEMPERATURE"
  | "HIGH_TEMPERATURE"
  | "EXTREMITIES"
  | "HIGH_WIND"
  | "RAIN"
  | "SHOWERS"
  | "WARM_RAIN"
  | "DRY"
  | "COLD_PREFERENCE"
  | "HOT_PREFERENCE"
  | "SUN";

export type Reason = {
  code: ReasonCode;
  /** Values the explanation text needs. Temperatures in °C, wind in km/h. */
  params: Record<string, string | number>;
};

export type WarningCode =
  | "THUNDERSTORM"
  | "EXTREME_HEAT"
  | "HEAT"
  | "EXTREME_COLD"
  | "DANGEROUS_WIND"
  | "STRONG_WIND"
  | "ICE"
  | "SNOW"
  | "RAIN_TIMING"
  | "TEMPERATURE_DROP"
  | "TEMPERATURE_RISE"
  | "COLD_START"
  | "HIGH_UV"
  | "DARKNESS"
  | "FOG";

export type WarningSeverity = "danger" | "caution" | "info";

export type Warning = {
  code: WarningCode;
  severity: WarningSeverity;
  params: Record<string, string | number>;
};

export type OutfitRecommendation = {
  top: ClothingItem;
  bottom: ClothingItem;
  socks: ClothingItem;
  accessories: ClothingItem[];
  outerLayer?: ClothingItem;
  reasons: Reason[];
  warnings: Warning[];
  /**
   * The temperature the runner will effectively experience (°C), after
   * intensity, preference, wind and rain adjustments. Useful for tuning.
   */
  comfortTemperature: number;
};
