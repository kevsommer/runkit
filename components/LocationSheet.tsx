"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, LocateIcon, PinIcon, SearchIcon } from "./Icons";
import { locateMe, setLocation, type LocationStatus } from "@/lib/store";
import type { GeoLocation } from "@/lib/weather/types";

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; results: GeoLocation[] }
  | { kind: "error" };

const describe = (l: GeoLocation) => [l.region, l.country].filter(Boolean).join(", ");

/** City search with a "use my location" shortcut. */
export function LocationSearch({
  locationStatus,
  onDone,
  autoFocus = false,
}: {
  locationStatus: LocationStatus;
  onDone?: () => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ kind: "idle" });
  const requested = useRef(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearch({ kind: "loading" });
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { results: GeoLocation[] };
        setSearch({ kind: "results", results: body.results });
      } catch {
        if (!ctrl.signal.aborted) setSearch({ kind: "error" });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  // Close once a GPS lookup we started has succeeded.
  useEffect(() => {
    if (requested.current && locationStatus === "idle") {
      requested.current = false;
      onDone?.();
    }
  }, [locationStatus, onDone]);

  const showResults = query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => {
          requested.current = true;
          locateMe();
        }}
        disabled={locationStatus === "locating"}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-chip text-sm font-semibold transition hover:border-muted focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
      >
        <LocateIcon />
        {locationStatus === "locating" ? "Finding you…" : "Use my current location"}
      </button>
      {locationStatus === "denied" && (
        <p className="text-sm text-muted" role="status">
          Location access is off. Search for your city instead — you can enable location in your browser settings any time.
        </p>
      )}
      {locationStatus === "unavailable" && (
        <p className="text-sm text-muted" role="status">
          We couldn&apos;t determine your location. Search for your city instead.
        </p>
      )}

      <label className="relative block">
        <span className="sr-only">Search for a city or place</span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your location"
          autoComplete="off"
          autoFocus={autoFocus}
          className="h-12 w-full rounded-2xl border border-border bg-chip pl-10 pr-4 text-base placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>

      {showResults && (
        <div aria-live="polite" className="min-h-6">
          {search.kind === "loading" && <p className="px-1 text-sm text-muted">Searching…</p>}
          {search.kind === "error" && (
            <p className="px-1 text-sm text-muted">Search isn&apos;t available right now. Check your connection and try again.</p>
          )}
          {search.kind === "results" && search.results.length === 0 && (
            <p className="px-1 text-sm text-muted">No places found for “{query.trim()}”.</p>
          )}
          {search.kind === "results" && search.results.length > 0 && (
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {search.results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(r);
                      onDone?.();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-background focus-visible:bg-background focus-visible:outline-none"
                  >
                    <PinIcon className="size-4 shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className="block truncate text-xs text-muted">{describe(r)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Modal sheet for changing location. */
export default function LocationSheet({
  open,
  onClose,
  locationStatus,
}: {
  open: boolean;
  onClose: () => void;
  locationStatus: LocationStatus;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="location-title"
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      {open && (
        <div className="rk-rise flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <h2 id="location-title" className="text-lg font-semibold">
              Change location
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-background focus-visible:outline-2 focus-visible:outline-accent"
            >
              <CloseIcon />
            </button>
          </div>
          <LocationSearch locationStatus={locationStatus} onDone={onClose} autoFocus />
        </div>
      )}
    </dialog>
  );
}
