import type { UserConsumptionRow } from "@/hooks/useLangfuseDashboardData";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Props {
  data: UserConsumptionRow[];
  loading?: boolean;
}

export const UserConsumptionWidget = ({ data, loading }: Props) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-[var(--bg-elevated)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
        No user consumption data in this range
      </div>
    );
  }

  // Mask userId for display
  const maskId = (id: string) =>
    id.length > 16 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;

  const chartData = data.slice(0, 10).map(d => ({
    user: maskId(d.userId),
    fullUser: d.userId,
    cost: +d.totalCost.toFixed(6),
    traces: d.countTraces,
  }));

  return (
    <div className="space-y-3">
      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 28)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${Number(v).toFixed(4)}`}
          />
          <YAxis
            type="category"
            dataKey="user"
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
            formatter={(value: unknown, name: unknown) => {
              if (String(name) === "cost") return [`$${Number(value ?? 0).toFixed(6)}`, "Cost"];
              return [Number(value ?? 0).toLocaleString(), "Traces"];
            }}
          />
          <Bar dataKey="cost" fill="#14B8A6" radius={[0, 4, 4, 0]} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="text-left py-1 font-medium">User (API Key)</th>
              <th className="text-right py-1 font-medium">Traces</th>
              <th className="text-right py-1 font-medium">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(d => (
              <tr
                key={d.userId}
                className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <td className="py-1.5 font-mono text-[10px] text-[var(--text-primary)]">
                  {maskId(d.userId)}
                </td>
                <td className="py-1.5 text-right text-[10px] text-[var(--text-secondary)] font-mono">
                  {d.countTraces.toLocaleString()}
                </td>
                <td className="py-1.5 text-right text-[10px] text-[var(--text-secondary)] font-mono">
                  ${d.totalCost.toFixed(6)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
