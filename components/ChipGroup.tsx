"use client";

import { useId, type ReactNode } from "react";

export type ChipOption<T extends string | number> = {
  value: T;
  label: string;
  /** Secondary line, e.g. "Tomorrow". */
  sub?: string;
  ariaLabel?: string;
  /** Shown instead of the label text; the label stays available to screen readers. */
  icon?: ReactNode;
};

/**
 * A row of selectable chips backed by native radio inputs, so arrow keys,
 * focus and screen readers all work for free.
 */
export default function ChipGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  scroll = false,
  fill = false,
  hideLegend = false,
}: {
  legend: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  scroll?: boolean;
  /** Stretch chips into equal-width columns on a single row. */
  fill?: boolean;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className={hideLegend ? "sr-only" : "eyebrow mb-2"}>{legend}</legend>
      <div
        className={
          scroll
            ? "no-scrollbar -mx-5 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:scroll-px-0 lg:px-0"
            : fill
              ? "flex gap-1 min-[360px]:gap-1.5"
              : "flex flex-wrap gap-2"
        }
      >
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label key={String(o.value)} className={`relative snap-start ${fill ? "min-w-0 flex-1" : "shrink-0"}`}>
              <input
                type="radio"
                name={name}
                value={String(o.value)}
                checked={checked}
                onChange={() => onChange(o.value)}
                aria-label={o.ariaLabel}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-11 cursor-pointer select-none flex-col items-center justify-center rounded-2xl border ${o.sub ? "py-1" : "py-2"} ${fill ? "px-0.5 text-xs min-[360px]:text-[13px] min-[380px]:text-sm" : "px-4 text-sm"} font-medium transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                  checked
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-chip text-foreground hover:border-muted"
                }`}
              >
                {o.icon ? (
                  <>
                    {o.icon}
                    <span className="sr-only">{o.label}</span>
                  </>
                ) : (
                  <span className="leading-tight">{o.label}</span>
                )}
                {o.sub && (
                  <span className={`text-[10px] font-medium leading-tight ${checked ? "opacity-70" : "text-muted"}`}>
                    {o.sub}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
