export const StatsBar = ({ stats }: { stats: { label: string; value: string | number }[] }) => {
  return (
    <div className="flex items-center gap-4 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-muted)] mb-4 flex-wrap">
      {stats.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--border)] select-none">·</span>}
          <span className="text-[var(--text-secondary)]">{s.label}:</span>
          <span className="font-medium text-[var(--text-primary)]">{String(s.value)}</span>
        </span>
      ))}
    </div>
  );
};
