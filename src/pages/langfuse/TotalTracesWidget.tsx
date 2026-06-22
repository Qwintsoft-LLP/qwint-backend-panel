import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Props {
  totalItems: number;
  byName: Record<string, number>;
  loading?: boolean;
}

export const TotalTracesWidget = ({ totalItems, byName, loading }: Props) => {
  const chartData = Object.entries(byName)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-3">
      {/* KPI */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-[var(--accent)]/10">
          <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
          </svg>
        </div>
        <div>
          {loading ? (
            <div className="h-7 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold font-mono text-[var(--text-primary)] leading-none">
              {totalItems.toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Total traces tracked</p>
        </div>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 28)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 11,
                color: "var(--text-primary)",
              }}
            />
            <Bar dataKey="count" fill="#7C3AED" radius={[0, 4, 4, 0]} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {!loading && chartData.length === 0 && (
        <div className="h-20 flex items-center justify-center text-xs text-[var(--text-muted)]">
          No traces in this period
        </div>
      )}
    </div>
  );
};
