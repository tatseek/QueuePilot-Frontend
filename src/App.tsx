import { useEffect, useState } from "react";

type HealthState = "checking" | "ok" | "unavailable" | "unreachable";

type Job = {
  id: string;
  type: string;
  status: string;
  result: Record<string, unknown> | null;
  error_message: string | null;
};

const demoAccounts = [
  ["Tenant A", "a@queuepilot.local"],
  ["Tenant B", "b@queuepilot.local"],
  ["Tenant C", "c@queuepilot.local"],
  ["Admin", "admin@queuepilot.local"],
] as const;

const policies = ["fifo", "priority", "wrr", "wdrr"] as const;

export default function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [email, setEmail] = useState("a@queuepilot.local");
  const password = "queuepilot";
  const [token, setToken] = useState("");
  const [duration, setDuration] = useState(3);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState("");
  const [policy, setPolicy] = useState("fifo");
  const isAdmin = email === "admin@queuepilot.local" && token !== "";

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/health")
        .then(async (response) => {
          if (!cancelled) {
            setHealth(response.ok ? "ok" : "unavailable");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setHealth("unreachable");
          }
        });
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!token || !job || ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
      return;
    }
    const timer = window.setInterval(() => {
      fetch(`/api/jobs/${job.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((response) => response.json())
        .then((body: Job) => setJob(body))
        .catch(() => setMessage("Could not refresh the job."));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [token, job]);

  async function login() {
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    if (!response.ok) {
      setToken("");
      setMessage(body.detail ?? "Login failed");
      return;
    }
    setToken(body.access_token);
    setJob(null);
    if (email === "admin@queuepilot.local") {
      const scheduler = await fetch("/api/admin/scheduler", {
        headers: { Authorization: `Bearer ${body.access_token}` },
      });
      if (scheduler.ok) {
        const current = await scheduler.json();
        setPolicy(current.policy);
      }
    }
  }

  async function changePolicy(next: string) {
    const response = await fetch("/api/admin/scheduler", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ policy: next }),
    });
    if (!response.ok) {
      setMessage("Could not change the scheduler.");
      return;
    }
    const body = await response.json();
    setPolicy(body.policy);
  }

  async function submitJob() {
    setMessage("");
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: "sleep",
        priority: 0,
        params: { duration_seconds: duration },
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(typeof body.detail === "string" ? body.detail : "Could not submit the job");
      return;
    }
    setJob(body);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto w-full max-w-lg">
        <p className="text-sm font-medium tracking-[0.2em] text-slate-400 uppercase">QueuePilot</p>
        <h1 className="mt-3 text-4xl font-semibold">Submit a job</h1>
        <p className="mt-4 text-slate-300">
          Log in as a demo tenant, submit a short sleep job, and watch FIFO move it to completed.
        </p>
        <p className="mt-6 text-sm text-slate-400">
          API health: <span className="text-slate-100">{health}</span>
        </p>

        <label className="mt-8 block text-sm text-slate-300">
          Account
          <select
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          >
            {demoAccounts.map(([label, value]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="mt-4 rounded bg-sky-500 px-4 py-2 text-slate-950" onClick={login} type="button">
          {token ? "Logged in" : "Log in"}
        </button>

        {isAdmin && (
          <div className="mt-8">
            <p className="text-sm text-slate-300">Scheduler for the next dispatch</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {policies.map((name) => (
                <button
                  key={name}
                  className={`rounded px-3 py-2 text-sm ${policy === name ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-100"}`}
                  onClick={() => changePolicy(name)}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="mt-8 block text-sm text-slate-300">
          Sleep seconds
          <input
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
            type="number"
            min={1}
            max={30}
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
        </label>
        <button
          className="mt-4 rounded bg-emerald-400 px-4 py-2 text-slate-950 disabled:opacity-40"
          disabled={!token}
          onClick={submitJob}
          type="button"
        >
          Submit sleep job
        </button>

        {job && (
          <p className="mt-6 text-sm text-slate-300">
            {job.type} {job.id.slice(0, 8)} is <span className="text-slate-100">{job.status}</span>
            {job.error_message ? ` (${job.error_message})` : ""}
          </p>
        )}
        {message && <p className="mt-4 text-sm text-rose-300">{message}</p>}
      </section>
    </main>
  );
}
