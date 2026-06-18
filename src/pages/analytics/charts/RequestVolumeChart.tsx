import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export const RequestVolumeChart = ({
  data,
}: {
  data: { label: string; success: number; warn: number; error: number }[];
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="30%">
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
      <Tooltip
        contentStyle={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontSize: 11,
          color: "var(--text-primary)",
        }}
      />
      <Legend
        wrapperStyle={{ fontSize: 10, color: "var(--text-muted)", paddingTop: 8 }}
        iconSize={8}
        iconType="circle"
      />
      <Bar dataKey="success" stackId="a" fill="#22C55E" fillOpacity={0.85} name="Success" radius={[0,0,0,0]} />
      <Bar dataKey="warn"    stackId="a" fill="#F59E0B" fillOpacity={0.85} name="Warn" />
      <Bar dataKey="error"   stackId="a" fill="#EF4444" fillOpacity={0.85} name="Error" radius={[3,3,0,0]} />
    </BarChart>
  </ResponsiveContainer>
);
