import { useEffect, useState } from "react";

type HealthState = "checking" | "ok" | "unavailable" | "unreachable";

export default function App() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    fetch("/health")
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        setHealth(response.ok ? "ok" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) {
          setHealth("unreachable");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <section className="w-full max-w-lg">
        <p className="text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">QueuePilot</p>
        <h1 className="mt-3 text-4xl font-semibold">Foundation</h1>
        <p className="mt-4 text-slate-300">
          This shell talks to the local API. PostgreSQL and Redis start with Docker Compose. Job submission is the next milestone.
        </p>
        <p className="mt-8 text-sm text-slate-400">
          API health: <span className="text-slate-100">{health}</span>
        </p>
      </section>
    </main>
  );
}
