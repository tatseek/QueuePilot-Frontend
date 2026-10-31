# Dashboard

The foundation screen shows whether the API can reach PostgreSQL and Redis. It reads `GET /health` through the Vite dev proxy.

Later screens, in order:

1. Overview: queued, running, and completed jobs, worker count, latency, and throughput.
2. Jobs: submit a task, filter the list, and cancel work.
3. Workers: heartbeat, current job, and utilization.
4. Scheduler: policy, tenant weights, and concurrency limits.
5. Benchmarks: workload setup and comparison charts.

The first version polls every few seconds. WebSockets are optional. Charts use Recharts when the benchmark screen exists. Tailwind is already installed. Shared UI components are added with the screens, not before a screen needs them.
