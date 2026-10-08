"use client";

import Link from "next/link";
import { BackHeader, Splash, pageShell, primaryButton } from "@/components/AppChrome";
import ResultView from "@/components/ResultView";
import { WeatherError, WeatherLoading } from "@/components/WeatherCard";
import { useStore } from "@/lib/store";
import { useRunResult } from "@/lib/useRunResult";

export default function ResultPage() {
  const state = useStore();
  const result = useRunResult(state);

  let body: React.ReactNode;
  if (!state.hydrated) {
    body = <Splash />;
  } else if (!state.location) {
    body = (
      <div className="py-10">
        <p className="mb-4 text-muted">Set your location first so we can check the weather.</p>
        <Link href="/" className={primaryButton}>
          Choose location
        </Link>
      </div>
    );
  } else if (result.status === "ready") {
    body = (
      <>
        <ResultView state={state} result={result} />
        <Link href="/" className={`${primaryButton} mt-8 md:mx-auto md:max-w-sm`}>
          RUN AGAIN
        </Link>
      </>
    );
  } else if (!state.weather) {
    body = state.weatherStatus === "error" ? <WeatherError state={state} /> : <WeatherLoading />;
  } else {
    body = (
      <div className="py-10">
        <p className="mb-4 text-muted">
          There&apos;s no forecast for that time yet. Try an earlier start or a shorter run.
        </p>
        <Link href="/" className={primaryButton}>
          Change run
        </Link>
      </div>
    );
  }

  return (
    <main className={pageShell}>
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4">
        <BackHeader />
        {body}
      </div>
    </main>
  );
}
