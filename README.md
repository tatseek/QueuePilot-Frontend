# QueuePilot Frontend

React dashboard for the QueuePilot API. This repository currently shows the foundation shell and the API health check. Job, worker, scheduler, and benchmark screens come later.

The API, database, and workers live in the separate backend repository.

## Requirements

- Node.js LTS
- The backend API on port 8000

## Start

```powershell
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The dev server proxies `/health` to `http://127.0.0.1:8000`.

## Docs

- [Dashboard](docs/dashboard.md)
