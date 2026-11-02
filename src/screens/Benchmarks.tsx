import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, seconds } from "../api";
import type { BenchmarkRun } from "../types";

const algorithms = ["fifo", "priority", "wrr", "wdrr"] as const;
const presets = ["fairness", "priority", "unequal_cost"] as const;

export function Benchmarks({ token, role }: { token: string; role: string }) {
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [algorithm, setAlgorithm] = useState<(typeof algorithms)[number]>("fifo");
  const [preset, setPreset] = useState<(typeof presets)[number]>("fairness");
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (role !== "admin") {
      return;
    }
    let cancelled = false;
    const load = () => {
      api<BenchmarkRun[]>("/api/admin/benchmarks", token)
        .then((body) => {
          if (!cancelled) {
            setRuns(body);
            setSelectedId((current) => current || body[0]?.id || "");
          }
        })
        .catch((reason: Error) => {
          if (!cancelled) {
            setMessage(reason.message);
          }
        });
    };
    load();
    const timer = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, role]);

  async function start() {
    setMessage("");
    try {
      const created = await api<BenchmarkRun>("/api/admin/benchmarks", token, {
        method: "POST",
        body: JSON.stringify({ algorithm, preset, seed: 1 }),
      });
      setSelectedId(created.id);
      setMessage("Run started. The live policy switches for this run, then returns to the previous one.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not start the run");
    }
  }

  function download(run: BenchmarkRun) {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `benchmark-${run.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (role !== "admin") {
    return (
      <section>
        <h1 className="text-3xl font-semibold">Benchmarks</h1>
        <p className="mt-3 text-slate-300">Benchmark runs are started from the admin account.</p>
      </section>
    );
  }

  const selected = runs.find((run) => run.id === selectedId) ?? null;
  const tenantChart = (selected?.metrics?.per_tenant ?? []).map((tenant) => ({
    name: tenant.name.replace("Tenant ", ""),
    wait: tenant.mean_wait ?? 0,
  }));
  const comparison = runs
    .filter((run) => run.metrics?.status === "completed")
    .map((run) => ({
      name: `${run.algorithm}/${run.workload_config.name ?? "custom"}`,
      p95: run.metrics?.wait_seconds?.p95 ?? 0,
      jain: run.metrics?.jain_index ?? 0,
    }));

  return (
    <section>
      <h1 className="text-3xl font-semibold">Benchmarks</h1>
      <p className="mt-2 text-slate-300">
        Presets use short hash jobs so a laptop can finish them. The same runner accepts a custom workload of up to 1200 jobs.
      </p>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-300">
          Workload
          <select
            className="mt-1 block rounded border border-slate-700 bg-slate-900 px-3 py-2"
            value={preset}
            onChange={(event) => setPreset(event.target.value as (typeof presets)[number])}
          >
            {presets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Algorithm
          <select
            className="mt-1 block rounded border border-slate-700 bg-slate-900 px-3 py-2"
            value={algorithm}
            onChange={(event) => setAlgorithm(event.target.value as (typeof algorithms)[number])}
          >
            {algorithms.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-emerald-400 px-4 py-2 text-slate-950" onClick={start} type="button">
          Start run
        </button>
      </div>
      {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2 pr-3">Run</th>
              <th className="py-2 pr-3">Workload</th>
              <th className="py-2 pr-3">Algorithm</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">P95 wait</th>
              <th className="py-2">Jain</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.id}
                className="cursor-pointer border-t border-slate-800"
                onClick={() => setSelectedId(run.id)}
              >
                <td className="py-2 pr-3 font-mono text-xs">{run.id.slice(0, 8)}</td>
                <td className="py-2 pr-3">{run.workload_config.name ?? "custom"}</td>
                <td className="py-2 pr-3">{run.algorithm}</td>
                <td className="py-2 pr-3">{run.metrics?.status ?? "—"}</td>
                <td className="py-2 pr-3">{seconds(run.metrics?.wait_seconds?.p95)}</td>
                <td className="py-2">{run.metrics?.jain_index == null ? "—" : run.metrics.jain_index.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium">
              {selected.algorithm} / {selected.workload_config.name ?? "custom"}
            </h2>
            <button className="rounded bg-slate-800 px-3 py-2 text-sm" onClick={() => download(selected)} type="button">
              Export JSON
            </button>
          </div>
          {selected.metrics?.error && <p className="mt-2 text-sm text-rose-300">{selected.metrics.error}</p>}
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenantChart}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="wait" fill="#38bdf8" name="Mean wait (s)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {comparison.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Completed runs</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="p95" fill="#34d399" name="P95 wait (s)" />
                <Bar dataKey="jain" fill="#fbbf24" name="Jain index" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
