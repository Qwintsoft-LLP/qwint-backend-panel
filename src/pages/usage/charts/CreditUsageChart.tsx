import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const CreditUsageChart = ({ data }: { data: { label: string; credits: number }[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
      <defs>
        <linearGradient id="creditUsageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.35} />
          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
      <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, (dataMax: number) => (dataMax === 0 ? 1 : dataMax)]} />
      <Tooltip
        contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, color: "var(--text-primary)" }}
        formatter={(v: unknown) => {
          const numValue = typeof v === 'number' ? v : Number(v) || 0;
          return [`${numValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} credits`, "Used"];
        }}
      />
      <Area type="monotone" dataKey="credits" stroke="#7C3AED" strokeWidth={1.5} fill="url(#creditUsageGrad)" dot={false} activeDot={{ r: 3 }} />
    </AreaChart>
  </ResponsiveContainer>
);
