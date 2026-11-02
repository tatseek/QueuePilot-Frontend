export type Summary = {
  counts: Record<string, number>;
  queue_depth: number;
  worker_count: number;
  failure_rate: number | null;
  wait_seconds: { mean: number | null; p95: number | null };
  throughput_per_second: number | null;
  scheduling_overhead_ms: number | null;
  window_seconds: number;
};

export type TenantStat = {
  name: string;
  weight: number;
  completed: number;
  failed: number;
  service: number;
  normalized_service: number;
  mean_wait: number | null;
};

export type TenantMetrics = {
  jain_index: number | null;
  per_tenant: TenantStat[];
  failure_rate: number | null;
};

export type Job = {
  id: string;
  tenant_id: string;
  type: string;
  priority: number;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  attempt_count: number;
  estimated_cost: number;
  cancellation_requested: boolean;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  attempts: Attempt[];
};

export type Attempt = {
  id: string;
  attempt_number: number;
  state: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};

export type WorkerRow = {
  id: string;
  state: string;
  capacity: number;
  last_heartbeat: string | null;
  started_at: string;
  current_job_id: string | null;
  utilization: number;
};

export type TenantRow = {
  id: string;
  name: string;
  weight: number;
  max_concurrent_jobs: number;
};

export type ScalingEvent = {
  id: string;
  old_worker_count: number;
  new_worker_count: number;
  reason: string;
  timestamp: string;
};

export type BenchmarkRun = {
  id: string;
  algorithm: string;
  workload_config: { name?: string; jobs: { count: number }[] };
  random_seed: number | null;
  created_at: string;
  metrics: {
    status?: string;
    error?: string;
    unfinished?: number;
    jain_index?: number | null;
    failure_rate?: number | null;
    throughput_per_second?: number | null;
    wait_seconds?: { mean: number | null; p95: number | null };
    per_tenant?: TenantStat[];
    by_priority?: Record<string, number | null>;
  } | null;
};
