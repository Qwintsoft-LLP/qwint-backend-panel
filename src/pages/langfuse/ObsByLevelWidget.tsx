import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const LEVEL_COLORS: Record<string, string> = {
  DEFAULT:  "#3B82F6",
  DEBUG:    "#6366F1",
  WARNING:  "#F59E0B",
  ERROR:    "#EF4444",
};

const TYPE_COLORS: Record<string, string> = {
  GENERATION: "#7C3AED",
  SPAN:       "#3B82F6",
  EVENT:      "#F59E0B",
};

interface Props {
  totalItems: number;
  byLevel: Record<string, number>;
  byType: Record<string, number>;
  loading?: boolean;
}

export const ObsByLevelWidget = ({ totalItems, byLevel, byType, loading }: Props) => {
  if (loading) {
    return <div className="h-full bg-[var(--bg-elevated)] rounded animate-pulse" />;
  }

  const levelData = Object.entries(byLevel).map(([name, value]) => ({
    name,
    value,
    color: LEVEL_COLORS[name] ?? "#8C8C9A",
  }));

  const typeData = Object.entries(byType).map(([name, value]) => ({
    name,
    value,
    color: TYPE_COLORS[name] ?? "#8C8C9A",
  }));

  return (
    <div className="space-y-3">
      {/* Total count */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-[var(--info)]/10">
          <svg className="w-4 h-4 text-[var(--info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)] leading-none">
            {totalItems.toLocaleString()}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Total observations</p>
        </div>
      </div>

      {/* By type breakdown */}
      {typeData.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">By type</p>
          <div className="flex gap-2 flex-wrap">
            {typeData.map(item => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[10px]"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-[var(--text-secondary)] font-medium">{item.name}</span>
                <span className="text-[var(--text-muted)] font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By level donut */}
      {levelData.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">By level</p>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie
                data={levelData}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="70%"
                paddingAngle={2}
                dataKey="value"
              >
                {levelData.map(entry => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--text-primary)",
                }}
                formatter={(value: unknown) => [Number(value ?? 0).toLocaleString(), "Count"]}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }}
                iconSize={8}
                iconType="circle"
                layout="horizontal"
                verticalAlign="bottom"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {levelData.length === 0 && typeData.length === 0 && (
        <div className="h-16 flex items-center justify-center text-xs text-[var(--text-muted)]">
          No observations in this range
        </div>
      )}
    </div>
  );
};
