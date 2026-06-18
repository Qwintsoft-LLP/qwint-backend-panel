import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export const ResponseTimeChart = ({
  data,
}: {
  data: { label: string; count: number }[];
}) => {
  const max = Math.max(...data.map(d => d.count));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
          }}
          formatter={(v: any) => [Number(v).toLocaleString(), "Requests"]}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => {
            // Color: green for fast, yellow for medium, red for slow
            const color =
              i === 0 ? "#22C55E" :
              i === 1 ? "#86EFAC" :
              i === 2 ? "#F59E0B" :
              i === 3 ? "#FB923C" :
                        "#EF4444";
            return (
              <Cell
                key={i}
                fill={color}
                fillOpacity={entry.count === max ? 1 : 0.7}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
