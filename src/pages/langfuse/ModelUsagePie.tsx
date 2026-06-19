import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { LfDailyMetric } from "@/api/langfuse";

const MODEL_COLORS = [
  "#7C3AED", "#3B82F6", "#22C55E", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
  "#6366F1", "#A855F7",
];

export const ModelUsagePie = ({ data }: { data: LfDailyMetric[] }) => {
  // Aggregate tokens + cost by model across all days
  const modelTotals: Record<string, { tokens: number; cost: number }> = {};
  data.forEach(day => {
    day.usage.forEach(u => {
      if (!modelTotals[u.model]) modelTotals[u.model] = { tokens: 0, cost: 0 };
      modelTotals[u.model].tokens += u.totalUsage;
      modelTotals[u.model].cost   += u.totalCost;
    });
  });

  const pieData = Object.entries(modelTotals)
    .sort(([, a], [, b]) => b.tokens - a.tokens)
    .map(([model, d], i) => ({
      name:  model || "unknown",
      value: d.tokens,
      cost:  d.cost,
      color: MODEL_COLORS[i % MODEL_COLORS.length],
    }));

  if (!pieData.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      No model data
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="42%"
          innerRadius="48%"
          outerRadius="68%"
          paddingAngle={2}
          dataKey="value"
        >
          {pieData.map(entry => (
            <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background:   "var(--bg-elevated)",
            border:       "1px solid var(--border)",
            borderRadius: 6,
            fontSize:     11,
            color:        "var(--text-primary)",
          }}
          formatter={(value: unknown, _: unknown, props: { payload?: { cost?: number; name?: string } }) => {
            const v = Number(value ?? 0);
            const cost = props.payload?.cost ?? 0;
            const name = props.payload?.name ?? "";
            return [`${v.toLocaleString()} tokens · $${cost.toFixed(5)}`, name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }}
          iconSize={8}
          iconType="circle"
          layout="horizontal"
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
