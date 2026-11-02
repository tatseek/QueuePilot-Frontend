import { useEffect, useState } from "react";
import { api } from "../api";
import type { WorkerRow } from "../types";

export function Workers({ token, role }: { token: string; role: string }) {
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role !== "admin") {
      return;
    }
    let cancelled = false;
    const load = () => {
      api<WorkerRow[]>("/api/workers", token)
        .then((body) => {
          if (!cancelled) {
            setWorkers(body);
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
  }, [token, role]);

  if (role !== "admin") {
    return (
      <section>
        <h1 className="text-3xl font-semibold">Workers</h1>
        <p className="mt-3 text-slate-300">Worker heartbeats are visible to the admin account.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold">Workers</h1>
      <p className="mt-2 text-slate-300">A worker at utilization 1 is running a job. Heartbeats older than 15 seconds are marked unhealthy by the scheduler.</p>
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2 pr-3">Worker</th>
              <th className="py-2 pr-3">State</th>
              <th className="py-2 pr-3">Capacity</th>
              <th className="py-2 pr-3">Utilization</th>
              <th className="py-2 pr-3">Current job</th>
              <th className="py-2">Heartbeat</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} className="border-t border-slate-800">
                <td className="py-2 pr-3 font-mono text-xs">{worker.id.slice(0, 8)}</td>
                <td className="py-2 pr-3">{worker.state}</td>
                <td className="py-2 pr-3">{worker.capacity}</td>
                <td className="py-2 pr-3">{worker.utilization.toFixed(0)}</td>
                <td className="py-2 pr-3 font-mono text-xs">{worker.current_job_id?.slice(0, 8) ?? "—"}</td>
                <td className="py-2">{worker.last_heartbeat ? new Date(worker.last_heartbeat).toLocaleTimeString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
