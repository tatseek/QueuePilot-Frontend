import { useEffect, useState } from "react";
import { api } from "../api";
import type { Job } from "../types";

const terminal = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export function Jobs({ token, role }: { token: string; role: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState("");
  const [jobType, setJobType] = useState("sleep");
  const [filterType, setFilterType] = useState("");
  const [priority, setPriority] = useState(0);
  const [duration, setDuration] = useState(2);
  const [rounds, setRounds] = useState(1000);
  const [title, setTitle] = useState("Weekly report");
  const [rows, setRows] = useState(5);
  const [selected, setSelected] = useState<Job | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selected || terminal.has(selected.status)) {
      return;
    }
    const jobId = selected.id;
    const timer = window.setInterval(() => {
      api<Job>(`/api/jobs/${jobId}`, token)
        .then((job) => {
          setSelected(job);
          setMessage(`${job.type} ${job.id.slice(0, 8)} is ${job.status}`);
        })
        .catch(() => setMessage("Could not refresh the job."));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [token, selected]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      const query = new URLSearchParams();
      if (status) {
        query.set("status", status);
      }
      if (filterType) {
        query.set("job_type", filterType);
      }
      const queryText = query.toString();
      const suffix = queryText ? `?${queryText}` : "";
      api<Job[]>(`/api/jobs${suffix}`, token)
        .then((body) => {
          if (!cancelled) {
            setJobs(body);
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
  }, [token, status, filterType]);

  async function submitJob() {
    setMessage("");
    const params =
      jobType === "sleep"
        ? { duration_seconds: duration }
        : jobType === "hash_compute"
          ? { rounds }
          : { title, rows };
    try {
      const created = await api<Job>("/api/jobs", token, {
        method: "POST",
        body: JSON.stringify({ type: jobType, priority, params }),
      });
      setSelected(created);
      setMessage(`${created.type} ${created.id.slice(0, 8)} is ${created.status}`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not submit the job");
    }
  }

  async function openJob(job: Job) {
    try {
      setSelected(await api<Job>(`/api/jobs/${job.id}`, token));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not load the job");
    }
  }

  async function cancel(job: Job) {
    try {
      const updated = await api<Job>(`/api/jobs/${job.id}/cancel`, token, { method: "POST" });
      setSelected(updated);
      setMessage(updated.status === "CANCELLED" ? "Cancelled." : "Cancellation requested.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not cancel the job");
    }
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold">Jobs</h1>
      <p className="mt-2 text-slate-300">Submit a whitelisted task and follow it until it finishes.</p>
      {role === "tenant" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Type
            <select
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
              value={jobType}
              onChange={(event) => setJobType(event.target.value)}
            >
              <option value="sleep">sleep</option>
              <option value="hash_compute">hash_compute</option>
              <option value="report_generate">report_generate</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Priority
            <input
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
              type="number"
              min={0}
              max={10}
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
            />
          </label>
          {jobType === "sleep" && (
            <label className="text-sm text-slate-300">
              Seconds
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                type="number"
                min={1}
                max={30}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
          )}
          {jobType === "hash_compute" && (
            <label className="text-sm text-slate-300">
              Rounds
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                type="number"
                min={1}
                max={100000}
                value={rounds}
                onChange={(event) => setRounds(Number(event.target.value))}
              />
            </label>
          )}
          {jobType === "report_generate" && (
            <>
              <label className="text-sm text-slate-300">
                Title
                <input
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="text-sm text-slate-300">
                Rows
                <input
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
                  type="number"
                  min={1}
                  max={100}
                  value={rows}
                  onChange={(event) => setRows(Number(event.target.value))}
                />
              </label>
            </>
          )}
          <div className="flex items-end">
            <button className="rounded bg-emerald-400 px-4 py-2 text-slate-950" onClick={submitJob} type="button">
              Submit
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Admin accounts can inspect every tenant’s jobs. Submit from a tenant account.</p>
      )}
      {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {["QUEUED", "DISPATCHED", "RUNNING", "RETRY_WAIT", "COMPLETED", "FAILED", "CANCELLED"].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
        >
          <option value="">All types</option>
          <option value="sleep">sleep</option>
          <option value="hash_compute">hash_compute</option>
          <option value="report_generate">report_generate</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2 pr-3">Job</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Attempts</th>
              <th className="py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="cursor-pointer border-t border-slate-800"
                onClick={() => openJob(job)}
              >
                <td className="py-2 pr-3 font-mono text-xs">{job.id.slice(0, 8)}</td>
                <td className="py-2 pr-3">{job.type}</td>
                <td className="py-2 pr-3">{job.priority}</td>
                <td className="py-2 pr-3">{job.status}</td>
                <td className="py-2 pr-3">{job.attempt_count}</td>
                <td className="py-2 text-rose-200">{job.error_message ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <article className="mt-6 rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm">
          <p className="font-mono text-xs text-slate-400">{selected.id}</p>
          <p className="mt-2">
            {selected.type} is {selected.status}
            {selected.cancellation_requested ? " (cancel requested)" : ""}
          </p>
          {selected.error_message && <p className="mt-2 text-rose-200">{selected.error_message}</p>}
          {selected.result && (
            <pre className="mt-3 overflow-x-auto text-xs text-slate-300">{JSON.stringify(selected.result, null, 2)}</pre>
          )}
          {selected.attempts.length > 0 && (
            <ul className="mt-3 space-y-1 text-slate-300">
              {selected.attempts.map((attempt) => (
                <li key={attempt.id}>
                  Attempt {attempt.attempt_number}: {attempt.state}
                  {attempt.error ? ` — ${attempt.error}` : ""}
                </li>
              ))}
            </ul>
          )}
          {role === "tenant" && !terminal.has(selected.status) && (
            <button className="mt-4 rounded bg-rose-400 px-3 py-2 text-slate-950" onClick={() => cancel(selected)} type="button">
              Cancel
            </button>
          )}
        </article>
      )}
    </section>
  );
}
