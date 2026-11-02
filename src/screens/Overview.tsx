import { useEffect, useState } from "react";
import { api, seconds } from "../api";
import type { Summary, TenantMetrics } from "../types";

export function Overview({ token }: { token: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tenants, setTenants] = useState<TenantMetrics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([
        api<Summary>("/api/metrics/summary", token),
        api<TenantMetrics>("/api/metrics/tenants", token),
      ])
        .then(([nextSummary, nextTenants]) => {
          if (!cancelled) {
            setSummary(nextSummary);
            setTenants(nextTenants);
            setError("");
          }
        })
        .catch((reason: Error) => {
          if (!cancelled) {
            setError(reason.message);
          }
        });
    };
    load();
    const timer = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const counts = summary?.counts ?? {};
  const cards = [
    ["Queued", counts.QUEUED ?? 0],
    ["Running", (counts.RUNNING ?? 0) + (counts.DISPATCHED ?? 0)],
    ["Completed", counts.COMPLETED ?? 0],
    ["Failed", counts.FAILED ?? 0],
    ["Workers", summary?.worker_count ?? 0],
  ] as const;

  return (
    <section>
      <h1 className="text-3xl font-semibold">Overview</h1>
      <p className="mt-2 text-slate-300">
        Counts are current. Wait, throughput, and failure rate use the last {summary?.window_seconds ?? 60}{" "}
        seconds.
      </p>
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
            <p className="text-xs tracking-wide text-slate-400 uppercase">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Mean wait" value={seconds(summary?.wait_seconds.mean)} />
        <Metric label="P95 wait" value={seconds(summary?.wait_seconds.p95)} />
        <Metric
          label="Throughput"
          value={
            summary?.throughput_per_second == null ? "—" : `${summary.throughput_per_second.toFixed(2)}/s`
          }
        />
        <Metric
          label="Scheduler overhead"
          value={summary?.scheduling_overhead_ms == null ? "—" : `${summary.scheduling_overhead_ms.toFixed(1)} ms`}
        />
      </div>
      <h2 className="mt-8 text-lg font-medium">Tenants</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2 pr-3">Tenant</th>
              <th className="py-2 pr-3">Weight</th>
              <th className="py-2 pr-3">Completed</th>
              <th className="py-2 pr-3">Mean wait</th>
              <th className="py-2">Service / weight</th>
            </tr>
          </thead>
          <tbody>
            {(tenants?.per_tenant ?? []).map((tenant) => (
              <tr key={tenant.name} className="border-t border-slate-800">
                <td className="py-2 pr-3">{tenant.name}</td>
                <td className="py-2 pr-3">{tenant.weight}</td>
                <td className="py-2 pr-3">{tenant.completed}</td>
                <td className="py-2 pr-3">{seconds(tenant.mean_wait)}</td>
                <td className="py-2">{tenant.normalized_service.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Jain index {tenants?.jain_index == null ? "—" : tenants.jain_index.toFixed(3)}. Closer to 1 means the
        completed work is closer to each tenant’s weight.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-xs tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </article>
  );
}
