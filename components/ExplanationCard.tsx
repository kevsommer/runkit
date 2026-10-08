import { describeReason, describeWarning, type Formatters } from "@/lib/recommendation/explanations";
import type { OutfitRecommendation, Warning } from "@/lib/recommendation/types";

export default function ExplanationCard({
  recommendation,
  fmt,
}: {
  recommendation: OutfitRecommendation;
  fmt: Formatters;
}) {
  return (
    <section aria-labelledby="why" className="rounded-3xl border border-border bg-card p-5">
      <h2 id="why" className="eyebrow mb-3">
        Why?
      </h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
        {recommendation.reasons.map((r) => (
          <p key={r.code}>{describeReason(r, fmt)}</p>
        ))}
      </div>
    </section>
  );
}

const STYLE: Record<Warning["severity"], string> = {
  danger: "border-danger/30 bg-danger-soft text-danger",
  caution: "border-caution/30 bg-caution-soft text-caution",
  info: "border-border bg-card text-foreground",
};

const ICON: Record<Warning["severity"], string> = { danger: "⚠️", caution: "⚠️", info: "ℹ️" };
const LABEL: Record<Warning["severity"], string> = { danger: "Warning", caution: "Caution", info: "Note" };

export function WarningList({ warnings, fmt, title }: { warnings: Warning[]; fmt: Formatters; title?: string }) {
  if (!warnings.length) return null;
  return (
    <section aria-label={title ?? "Weather warnings"}>
      {title && <h2 className="eyebrow mb-3">{title}</h2>}
      <ul className="flex flex-col gap-2">
        {warnings.map((w) => {
          const t = describeWarning(w, fmt);
          return (
            <li
              key={w.code}
              className={`flex gap-3 rounded-2xl border px-4 py-3 ${STYLE[w.severity]}`}
              role={w.severity === "danger" ? "alert" : undefined}
            >
              <span aria-hidden className="pt-0.5">
                {ICON[w.severity]}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">
                  <span className="sr-only">{LABEL[w.severity]}: </span>
                  {t.title}
                </p>
                <p className={`text-sm ${w.severity === "info" ? "text-muted" : "opacity-90"}`}>{t.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
