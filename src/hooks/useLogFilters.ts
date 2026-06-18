import { useSearchParams } from "react-router-dom";

export const useLogFilters = () => {
  const [params, setParams] = useSearchParams();

  const search     = params.get("q")     ?? "";
  const level      = params.get("level") ?? "all";
  const app        = params.get("app")   ?? "all";
  const apiKey     = params.get("key")   ?? "";
  const userId     = params.get("uid")   ?? "";
  const dateFrom   = params.get("from")  ?? "";
  const dateTo     = params.get("to")    ?? "";

  const method     = params.get("method")?? "all";

  const set = (key: string, value: string) =>
    setParams(p => { const n = new URLSearchParams(p); value ? n.set(key, value) : n.delete(key); return n; });

  return {
    search, level, app, apiKey, userId, dateFrom, dateTo, method,
    setSearch:   (v: string) => set("q",     v),
    setLevel:    (v: string) => set("level", v),
    setApp:      (v: string) => set("app",   v),
    setApiKey:   (v: string) => set("key",   v),
    setUserId:   (v: string) => set("uid",   v),
    setDateFrom: (v: string) => set("from",  v),
    setDateTo:   (v: string) => set("to",    v),
    setMethod:   (v: string) => set("method",v),
    clearAll:    () => setParams({}),
    activeCount: [search, level !== "all" && level, app !== "all" && app, method !== "all" && method, apiKey, userId, dateFrom, dateTo]
                   .filter(Boolean).length,
  };
};
