import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const MODEL_COLORS = [
  "#7C3AED", "#3B82F6", "#22C55E", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
  "#6366F1", "#A855F7",
];

interface Props {
  chartData: Record<string, unknown>[];
  models: string[];
  loading?: boolean;
}

export const CostByModelWidget = ({ chartData, models, loading }: Props) => {
  if (loading) {
    return <div className="h-full bg-[var(--bg-elevated)] rounded animate-pulse" />;
  }

  if (!chartData.length) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
        No cost data in this range
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -4 }}>
        <defs>
          {models.map((model, i) => (
            <linearGradient key={model} id={`costModelGrad_${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={MODEL_COLORS[i % MODEL_COLORS.length]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={MODEL_COLORS[i % MODEL_COLORS.length]} stopOpacity={0.01} />
            </linearGradient>
          ))}
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
          tickFormatter={v => v === 0 ? "$0" : `$${Number(v).toFixed(4)}`}
          width={52}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
          formatter={(value: unknown, name: unknown) => [
            `$${Number(value ?? 0).toFixed(6)}`,
            String(name ?? ""),
          ]}
        />
        {models.map((model, i) => (
          <Area
            key={model}
            type="monotone"
            dataKey={model}
            stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
            strokeWidth={1.5}
            fill={`url(#costModelGrad_${i})`}
            dot={false}
            activeDot={{ r: 3 }}
            stackId="cost"
            animationDuration={600}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
