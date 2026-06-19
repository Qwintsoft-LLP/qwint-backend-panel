import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const CreditsByAppChart = ({ data }: { data: { name: string; value: number; color: string }[] }) => {
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">No usage in this range</div>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="42%" innerRadius="55%" outerRadius="75%" paddingAngle={2} dataKey="value">
          {data.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.9} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11 }}
          formatter={(v: unknown, name: unknown) => {
            const numValue = typeof v === 'number' ? v : Number(v) || 0;
            const strName = typeof name === 'string' ? name : String(name || "");
            return [`${numValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`, strName];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} iconSize={8} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};
