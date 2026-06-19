
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props { data: { hour: string; credits: number }[] }

export const CreditBurnChart = ({ data }: Props) => {

  if (data.length < 2) return (
    <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted)]">
      Not enough data for trend
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, (dataMax: number) => (dataMax === 0 ? 1 : dataMax)]} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
          formatter={(v: any) => [`${v}`, "Credits Used"]}
        />
        <Line
          type="monotone"
          dataKey="credits"
          stroke="var(--accent)"  /* Use CSS var — works in both modes */
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "var(--accent)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
