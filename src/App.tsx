import { useEffect, useState } from "react";
import { Benchmarks } from "./screens/Benchmarks";
import { Jobs } from "./screens/Jobs";
import { Overview } from "./screens/Overview";
import { Scheduler } from "./screens/Scheduler";
import { Workers } from "./screens/Workers";

type HealthState = "checking" | "ok" | "unavailable" | "unreachable";
type Screen = "overview" | "jobs" | "workers" | "scheduler" | "benchmarks";

const demoAccounts = [
  ["Tenant A", "a@queuepilot.local"],
  ["Tenant B", "b@queuepilot.local"],
  ["Tenant C", "c@queuepilot.local"],
  ["Admin", "admin@queuepilot.local"],
] as const;

const screens: { id: Screen; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "jobs", label: "Jobs" },
  { id: "workers", label: "Workers" },
  { id: "scheduler", label: "Scheduler" },
  { id: "benchmarks", label: "Benchmarks" },
];

export default function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [email, setEmail] = useState(() => sessionStorage.getItem("qp.email") ?? "a@queuepilot.local");
  const [token, setToken] = useState(() => sessionStorage.getItem("qp.token") ?? "");
  const [role, setRole] = useState(() => sessionStorage.getItem("qp.role") ?? "");
  const [screen, setScreen] = useState<Screen>("overview");
  const [message, setMessage] = useState("");
  const password = "queuepilot";

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/health")
        .then((response) => {
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
      setRole("");
      sessionStorage.removeItem("qp.token");
      setMessage(body.detail ?? "Login failed");
      return;
    }
    sessionStorage.setItem("qp.token", body.access_token);
    sessionStorage.setItem("qp.role", body.role);
    sessionStorage.setItem("qp.email", body.email);
    setToken(body.access_token);
    setRole(body.role);
    setEmail(body.email);
  }

  function logout() {
    sessionStorage.clear();
    setToken("");
    setRole("");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">QueuePilot</p>
            <p className="text-sm text-slate-300">API health: {health}</p>
          </div>
          {token ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-300">{email}</span>
              <button className="rounded bg-slate-800 px-3 py-2" onClick={logout} type="button">
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">
        {!token ? (
          <section className="max-w-md">
            <h1 className="text-3xl font-semibold">Log in</h1>
            <p className="mt-2 text-slate-300">Demo password is queuepilot.</p>
            <label className="mt-6 block text-sm text-slate-300">
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
              Log in
            </button>
            {message && <p className="mt-4 text-sm text-rose-300">{message}</p>}
          </section>
        ) : (
          <>
            <nav className="mb-8 flex flex-wrap gap-2">
              {screens.map((item) => (
                <button
                  key={item.id}
                  className={`rounded px-3 py-2 text-sm ${screen === item.id ? "bg-sky-500 text-slate-950" : "bg-slate-800"}`}
                  onClick={() => setScreen(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
            {screen === "overview" && <Overview token={token} />}
            {screen === "jobs" && <Jobs token={token} role={role} />}
            {screen === "workers" && <Workers token={token} role={role} />}
            {screen === "scheduler" && <Scheduler token={token} role={role} />}
            {screen === "benchmarks" && <Benchmarks token={token} role={role} />}
          </>
        )}
      </div>
    </main>
  );
}
