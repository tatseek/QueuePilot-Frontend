# QueuePilot Frontend

React dashboard for the QueuePilot API: overview, jobs, workers, scheduler settings, and benchmarks.

The API, database, and workers live in the separate backend repository.

## Requirements

- Node.js LTS
- The backend API on port 8000

## Start

```powershell
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The dev server proxies `/health` and `/api` to `http://127.0.0.1:8000`.

Demo password: `queuepilot`. Tenant A, B, C, and Admin are on the login screen.

## Docs

- [Dashboard](docs/dashboard.md)
