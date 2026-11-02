import { useEffect, useState } from "react";
import { api } from "../api";
import type { ScalingEvent, TenantRow } from "../types";

const policies = ["fifo", "priority", "wrr", "wdrr"] as const;

export function Scheduler({ token, role }: { token: string; role: string }) {
  const [policy, setPolicy] = useState("fifo");
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [events, setEvents] = useState<ScalingEvent[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (role !== "admin") {
      return;
    }
    let cancelled = false;
    const load = () => {
      Promise.all([
        api<{ policy: string }>("/api/admin/scheduler", token),
        api<TenantRow[]>("/api/admin/tenants", token),
        api<ScalingEvent[]>("/api/admin/scaling", token),
      ])
        .then(([scheduler, nextTenants, nextEvents]) => {
          if (!cancelled) {
            setPolicy(scheduler.policy);
            setTenants(nextTenants);
            setEvents(nextEvents);
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

  async function changePolicy(next: string) {
    try {
      const body = await api<{ policy: string }>("/api/admin/scheduler", token, {
        method: "PATCH",
        body: JSON.stringify({ policy: next }),
      });
      setPolicy(body.policy);
      setMessage(`Next dispatch uses ${body.policy}.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not change the policy");
    }
  }

  async function saveTenant(tenant: TenantRow) {
    try {
      const saved = await api<TenantRow>(`/api/admin/tenants/${tenant.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ weight: tenant.weight, max_concurrent_jobs: tenant.max_concurrent_jobs }),
      });
      setTenants((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setMessage(`${saved.name} updated.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not update the tenant");
    }
  }

  if (role !== "admin") {
    return (
      <section>
        <h1 className="text-3xl font-semibold">Scheduler</h1>
        <p className="mt-3 text-slate-300">Policy and tenant weights are changed from the admin account.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold">Scheduler</h1>
      <p className="mt-2 text-slate-300">The policy applies to jobs that have not been dispatched yet. Changing it clears the fairness cursor.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {policies.map((name) => (
          <button
            key={name}
            className={`rounded px-3 py-2 text-sm ${policy === name ? "bg-sky-500 text-slate-950" : "bg-slate-800"}`}
            onClick={() => changePolicy(name)}
            type="button"
          >
            {name}
          </button>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="grid items-end gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:grid-cols-[1fr_8rem_8rem_auto]">
            <p className="font-medium">{tenant.name}</p>
            <label className="text-sm text-slate-300">
              Weight
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                type="number"
                min={1}
                max={100}
                value={tenant.weight}
                onChange={(event) =>
                  setTenants((current) =>
                    current.map((item) =>
                      item.id === tenant.id ? { ...item, weight: Number(event.target.value) } : item,
                    ),
                  )
                }
              />
            </label>
            <label className="text-sm text-slate-300">
              In-flight limit
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
                type="number"
                min={1}
                max={100}
                value={tenant.max_concurrent_jobs}
                onChange={(event) =>
                  setTenants((current) =>
                    current.map((item) =>
                      item.id === tenant.id
                        ? { ...item, max_concurrent_jobs: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </label>
            <button className="rounded bg-sky-500 px-3 py-2 text-slate-950" onClick={() => saveTenant(tenant)} type="button">
              Save
            </button>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-lg font-medium">Scaling events</h2>
      <ul className="mt-3 space-y-2 text-sm text-slate-300">
        {events.length === 0 && <li>No scale changes yet. Start scripts/autoscaler.py on the host to record them.</li>}
        {events.map((event) => (
          <li key={event.id}>
            {event.old_worker_count} → {event.new_worker_count}: {event.reason}
          </li>
        ))}
      </ul>
      {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
    </section>
  );
}
