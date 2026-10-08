import RunnerIllustration, { outfitLabel, type RunnerOutfit } from "./RunnerIllustration";
import { clothing, outfitItems } from "@/lib/recommendation/clothing";
import type { OutfitRecommendation } from "@/lib/recommendation/types";

const NAMES = Object.fromEntries(Object.values(clothing).map((c) => [c.id, c.name]));

const ROLE: Record<string, string> = {
  outer: "Outer layer",
  top: "Top",
  bottom: "Bottoms",
  accessory: "Extra",
};

export function toRunnerOutfit(r: OutfitRecommendation): RunnerOutfit {
  return {
    top: r.top.id,
    outer: r.outerLayer?.id,
    bottom: r.bottom.id,
    socks: r.socks.id,
    accessories: r.accessories.map((a) => a.id),
  };
}

export function RunnerFigure({ recommendation, className }: { recommendation: OutfitRecommendation; className?: string }) {
  const outfit = toRunnerOutfit(recommendation);
  return (
    <RunnerIllustration
      outfit={outfit}
      label={outfitLabel(outfit, NAMES)}
      className={className}
    />
  );
}

export default function OutfitCard({ recommendation }: { recommendation: OutfitRecommendation }) {
  // Socks are left out: most runners wear the same pair regardless of weather.
  const items = outfitItems(recommendation).filter((item) => item.category !== "socks");
  return (
    <section aria-labelledby="wear-this">
      <h2 id="wear-this" className="eyebrow mb-3">
        Wear this
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="rk-rise flex items-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-3"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-xl" aria-hidden>
              {item.emoji}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{item.name}</span>
              <span className="block text-xs text-muted">{ROLE[item.category]}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
