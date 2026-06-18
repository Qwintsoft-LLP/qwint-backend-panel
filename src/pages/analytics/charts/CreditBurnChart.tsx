import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-2 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      <p className="font-mono font-semibold text-[var(--accent)]">
        {payload[0].value.toFixed(2)} credits
      </p>
    </div>
  );
};

export const CreditBurnChart = ({ data }: { data: { label: string; credits: number }[] }) => {
  const avg = data.length
    ? data.reduce((s, d) => s + d.credits, 0) / data.length
    : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "avg", position: "right", fontSize: 9, fill: "var(--warning)" }}
          />
        )}
        <Area
          type="monotone"
          dataKey="credits"
          stroke="#7C3AED"
          strokeWidth={1.5}
          fill="url(#creditGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#7C3AED", stroke: "var(--bg-surface)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
