import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { LogEntry } from "@/hooks/useLogs";

export const LogLevelChart = ({ logs }: { logs: LogEntry[] }) => {
  const data = useMemo(() => {
    const counts = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.level] = (acc[l.level] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { level: "INFO",  count: counts["info"]  ?? 0, color: "#3B82F6" },
      { level: "WARN",  count: counts["warn"]  ?? 0, color: "#F59E0B" },
      { level: "ERROR", count: counts["error"] ?? 0, color: "#EF4444" },
    ];
  }, [logs]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="level" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry) => <Cell key={entry.level} fill={entry.color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
