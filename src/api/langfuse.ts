import axios from "axios";
import { getLangfuseSettings, getLangfuseAuthHeader } from "@/lib/storage";

// ── Separate axios instance — never uses backend baseURL or auth headers ──
export const langfuseClient = axios.create();

langfuseClient.interceptors.request.use(config => {
  const { host } = getLangfuseSettings();
  config.baseURL = host;
  config.headers["Authorization"] = getLangfuseAuthHeader();
  return config;
});

// ── Retry with exponential backoff for 429 rate limits ──
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

langfuseClient.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    const status = err.response?.status;

    // Retry on 429 (rate limit) with exponential backoff
    if (status === 429 && config && (config._retryCount ?? 0) < MAX_RETRIES) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      const delay = BASE_DELAY_MS * Math.pow(2, config._retryCount - 1);
      await new Promise(r => setTimeout(r, delay));
      return langfuseClient(config);
    }

    const message = err.response?.data?.message ?? err.message ?? "Langfuse error";
    return Promise.reject({ status, message, isLangfuse: true });
  }
);

// ── Types ──────────────────────────────────────────────────────────────────

export interface LfTrace {
  id:          string;
  timestamp:   string;
  name:        string | null;
  userId:      string | null;   // = your api_key
  sessionId:   string | null;   // = your reqc-id
  input:       unknown;
  output:      unknown;
  metadata:    Record<string, unknown> | null;
  tags:        string[];
  latency:     number | null;   // seconds
  totalCost:   number | null;   // USD
  usage: {
    input:     number | null;
    output:    number | null;
    total:     number | null;
    unit:      string | null;
  } | null;
}

export interface LfObservation {
  id:               string;
  traceId:          string;
  type:             "GENERATION" | "SPAN" | "EVENT";
  name:             string | null;
  startTime:        string;
  endTime:          string | null;
  input:            unknown;
  output:           unknown;
  model:            string | null;
  modelParameters:  Record<string, unknown> | null;
  usage: {
    input:       number | null;
    output:      number | null;
    total:       number | null;
    unit:        string | null;
    inputCost:   number | null;
    outputCost:  number | null;
    totalCost:   number | null;
  } | null;
  latency:          number | null;
  statusMessage:    string | null;
  metadata:         Record<string, unknown> | null;
}

export interface LfSession {
  id:          string;
  createdAt:   string;
  projectId:   string;
  userIds:     string[];
  countTraces: number;
}

export interface LfDailyMetric {
  date:              string;
  countTraces:       number;
  countObservations: number;
  totalCost:         number;
  usage: {
    model:       string;
    inputUsage:  number;
    outputUsage: number;
    totalUsage:  number;
    countTraces: number;
    totalCost:   number;
  }[];
}

export interface LfPaginatedResponse<T> {
  data: T[];
  meta: {
    page:       number;
    limit:      number;
    totalItems: number;
    totalPages: number;
  };
}

// ── API functions ──────────────────────────────────────────────────────────

export const langfuseApi = {
  // All traces for an API key (userId = api_key)
  tracesByKey: (apiKey: string, page = 1, limit = 20) =>
    langfuseClient
      .get<LfPaginatedResponse<LfTrace>>("/api/public/traces", {
        params: { userId: apiKey, page, limit, orderBy: "timestamp.DESC" },
      })
      .then(r => r.data),

  // Single trace with full detail
  trace: (traceId: string) =>
    langfuseClient
      .get<LfTrace & { observations: LfObservation[] }>(`/api/public/traces/${traceId}`)
      .then(r => r.data),

  // All sessions for an API key
  sessionsByKey: (apiKey: string, page = 1, limit = 20) =>
    langfuseClient
      .get<LfPaginatedResponse<LfSession>>("/api/public/sessions", {
        params: { userId: apiKey, page, limit },
      })
      .then(r => r.data),

  // Single session (reqc-id) → all traces in it
  tracesBySession: (sessionId: string) =>
    langfuseClient
      .get<LfPaginatedResponse<LfTrace>>("/api/public/traces", {
        params: { sessionId, limit: 100 },
      })
      .then(r => r.data),

  // All observations (LLM calls) for an API key
  observationsByKey: (apiKey: string, page = 1, limit = 50) =>
    langfuseClient
      .get<LfPaginatedResponse<LfObservation>>("/api/public/observations", {
        params: { userId: apiKey, type: "GENERATION", page, limit },
      })
      .then(r => r.data),

  // All observations for a single trace
  observationsByTrace: (traceId: string) =>
    langfuseClient
      .get<LfPaginatedResponse<LfObservation>>("/api/public/observations", {
        params: { traceId, limit: 100 },
      })
      .then(r => r.data),

  // Daily cost + usage metrics for a key or globally
  dailyMetrics: (apiKey?: string, limit = 30) =>
    langfuseClient
      .get<{ data: LfDailyMetric[] }>("/api/public/metrics/daily", {
        params: { ...(apiKey ? { userId: apiKey } : {}), limit },
      })
      .then(r => r.data),
};
