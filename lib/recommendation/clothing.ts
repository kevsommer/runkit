import type { ClothingId, ClothingItem } from "./types";

export const clothing: Record<ClothingId, ClothingItem> = {
  short_sleeve: { id: "short_sleeve", name: "Short-sleeve running shirt", category: "top", emoji: "👕" },
  light_long_sleeve: { id: "light_long_sleeve", name: "Lightweight long-sleeve", category: "top", emoji: "👕" },
  thermal_long_sleeve: { id: "thermal_long_sleeve", name: "Thermal long-sleeve", category: "top", emoji: "👕" },

  windbreaker: { id: "windbreaker", name: "Lightweight windbreaker", category: "outer", emoji: "🧥" },
  waterproof_shell: { id: "waterproof_shell", name: "Waterproof shell", category: "outer", emoji: "🧥" },
  insulated_jacket: { id: "insulated_jacket", name: "Insulated running jacket", category: "outer", emoji: "🧥" },

  shorts: { id: "shorts", name: "Running shorts", category: "bottom", emoji: "🩳" },
  half_tights: { id: "half_tights", name: "Half tights", category: "bottom", emoji: "🩳" },
  light_tights: { id: "light_tights", name: "Lightweight tights", category: "bottom", emoji: "👖" },
  thermal_tights: { id: "thermal_tights", name: "Thermal tights", category: "bottom", emoji: "👖" },
  running_trousers: { id: "running_trousers", name: "Running trousers", category: "bottom", emoji: "👖" },

  light_socks: { id: "light_socks", name: "Lightweight socks", category: "socks", emoji: "🧦" },
  medium_socks: { id: "medium_socks", name: "Medium socks", category: "socks", emoji: "🧦" },
  heavy_socks: { id: "heavy_socks", name: "Heavy socks", category: "socks", emoji: "🧦" },

  light_gloves: { id: "light_gloves", name: "Lightweight gloves", category: "accessory", emoji: "🧤" },
  warm_gloves: { id: "warm_gloves", name: "Warm gloves", category: "accessory", emoji: "🧤" },
  beanie: { id: "beanie", name: "Beanie", category: "accessory", emoji: "🧶" },
  cap: { id: "cap", name: "Cap", category: "accessory", emoji: "🧢" },
  neck_gaiter: { id: "neck_gaiter", name: "Neck gaiter", category: "accessory", emoji: "🧣" },
  sunglasses: { id: "sunglasses", name: "Sunglasses", category: "accessory", emoji: "🕶️" },
};

/** Every item in a recommendation, outermost-first for the upper body. */
export function outfitItems(o: {
  top: ClothingItem;
  outerLayer?: ClothingItem;
  bottom: ClothingItem;
  socks: ClothingItem;
  accessories: ClothingItem[];
}): ClothingItem[] {
  return [
    ...(o.outerLayer ? [o.outerLayer] : []),
    o.top,
    o.bottom,
    o.socks,
    ...o.accessories,
  ];
}
