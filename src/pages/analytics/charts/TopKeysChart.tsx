import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export const TopKeysChart = ({
  data,
}: {
  data: { key: string; credits: number; requests: number }[];
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
    >
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
      <XAxis
        type="number"
        tick={{ fontSize: 10, fill: "var(--text-muted)" }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        type="category"
        dataKey="key"
        tick={{ fontSize: 10, fill: "var(--text-secondary)", fontFamily: "monospace" }}
        axisLine={false}
        tickLine={false}
        width={240}
      />
      <Tooltip
        contentStyle={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontSize: 11,
          color: "var(--text-primary)",
        }}
        formatter={(v: any, name: any) =>
          [name === "credits" ? `${Number(v).toFixed(2)} cr` : Number(v).toLocaleString(), name === "credits" ? "Credits" : "Requests"]
        }
      />
      <Bar dataKey="credits" radius={[0, 3, 3, 0]} maxBarSize={18}>
        {data.map((_, i) => (
          <Cell
            key={i}
            fill="#7C3AED"
            fillOpacity={1 - i * 0.07}   // Fade from top to bottom for rank effect
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
