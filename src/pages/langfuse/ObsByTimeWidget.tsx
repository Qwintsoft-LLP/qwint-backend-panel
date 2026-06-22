import type { TimeSeriesPoint } from "@/hooks/useLangfuseDashboardData";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Props {
  data: TimeSeriesPoint[];
  loading?: boolean;
}

export const ObsByTimeWidget = ({ data, loading }: Props) => {
  if (loading) {
    return <div className="h-full bg-[var(--bg-elevated)] rounded animate-pulse" />;
  }

  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
        No observations in this range
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="obsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
          formatter={(value: unknown) => [Number(value ?? 0).toLocaleString(), "Observations"]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#3B82F6"
          strokeWidth={1.5}
          fill="url(#obsGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#3B82F6" }}
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
