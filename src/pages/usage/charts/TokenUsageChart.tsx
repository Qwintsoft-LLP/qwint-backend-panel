import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const TokenUsageChart = ({ data }: { data: { label: string; input: number; output: number }[] }) => {
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      No token usage data available
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, (dataMax: number) => (dataMax === 0 ? 1 : dataMax)]} />
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11 }}
          formatter={(v: unknown, name: unknown) => {
            const numValue = typeof v === 'number' ? v : Number(v) || 0;
            const strName = typeof name === 'string' ? name : String(name || "");
            return [numValue.toLocaleString(), strName === "input" ? "Input tokens" : "Output tokens"];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} iconSize={8} iconType="circle" />
        <Area type="monotone" dataKey="input"  stackId="1" stroke="#3B82F6" fill="url(#inputGrad)"  strokeWidth={1.5} name="Input" />
        <Area type="monotone" dataKey="output" stackId="1" stroke="#10B981" fill="url(#outputGrad)" strokeWidth={1.5} name="Output" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
