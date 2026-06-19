import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const LogLevelChart = ({ data }: { data: { name: string; value: number }[] }) => {
  const chartData = [
    { level: "INFO",  count: data.find(d => d.name === "INFO")?.value ?? 0, color: "#3B82F6" },
    { level: "WARN",  count: data.find(d => d.name === "WARN")?.value ?? 0, color: "#F59E0B" },
    { level: "ERROR", count: data.find(d => d.name === "ERROR")?.value ?? 0, color: "#EF4444" },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
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
          {chartData.map((entry) => <Cell key={entry.level} fill={entry.color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
