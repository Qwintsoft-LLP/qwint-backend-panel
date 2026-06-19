import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import type { LfDailyMetric } from "@/api/langfuse";

export const DailyCostChart = ({ data }: { data: LfDailyMetric[] }) => {
  const chartData = [...data]
    .reverse()  // API returns newest first — reverse to left→right chronological
    .map(d => ({
      date:   format(parseISO(d.date), "MMM d"),
      cost:   +d.totalCost.toFixed(6),
      traces: d.countTraces,
      tokens: d.usage.reduce((s, u) => s + u.totalUsage, 0),
    }));

  if (!chartData.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      No daily cost data
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v === 0 ? "$0" : `$${v.toFixed(4)}`}
          width={56}
        />
        <Tooltip
          contentStyle={{
            background:   "var(--bg-elevated)",
            border:       "1px solid var(--border)",
            borderRadius: 6,
            fontSize:     11,
            color:        "var(--text-primary)",
          }}
          formatter={(value: unknown, name: unknown) => {
            const v = Number(value ?? 0);
            const n = String(name ?? "");
            if (n === "cost")   return [`$${v.toFixed(6)}`, "Cost"];
            if (n === "traces") return [v.toLocaleString(), "Traces"];
            return [v.toLocaleString(), "Tokens"];
          }}
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#7C3AED"
          strokeWidth={1.5}
          fill="url(#costGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#7C3AED" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
