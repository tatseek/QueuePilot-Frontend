# Dashboard

The app has five screens. They poll the API about every 2.5 seconds.

1. Overview reads `/api/metrics/summary` and `/api/metrics/tenants`.
2. Jobs submits `sleep`, `hash_compute`, or `report_generate`, filters the list, and cancels.
3. Workers shows heartbeat, state, current job, and utilization. Admin only.
4. Scheduler changes the policy, tenant weight, and in-flight limit, and lists scaling events. Admin only.
5. Benchmarks starts a preset run, charts mean wait and a comparison of finished runs, and exports the JSON. Admin only.

Charts use Recharts. Tailwind styles the layout. Log in with a demo account. The password is `queuepilot`.
