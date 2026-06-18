
interface HourSlot {
  hour:      number;
  count:     number;
  credits:   number;
  intensity: number;   // 0..1
}

export const HourlyHeatmap = ({ data }: { data: HourSlot[] }) => (
  <div>
    <div className="flex gap-1">
      {data.map(slot => {
        const alpha = 0.1 + slot.intensity * 0.9;
        return (
          <div
            key={slot.hour}
            className="flex-1 min-w-0 group relative"
            title={`${String(slot.hour).padStart(2, "0")}:00 — ${slot.count} requests, ${slot.credits.toFixed(1)} cr`}
          >
            <div
              className="h-10 rounded-sm transition-all duration-300 cursor-default"
              style={{ backgroundColor: `rgba(124, 58, 237, ${alpha})` }}
            />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] text-[var(--text-primary)] whitespace-nowrap shadow-md">
                <p className="font-semibold">{String(slot.hour).padStart(2, "0")}:00</p>
                <p>{slot.count} req</p>
                <p>{slot.credits.toFixed(1)} cr</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    {/* Hour labels */}
    <div className="flex gap-1 mt-1">
      {data.map(slot => (
        <div key={slot.hour} className="flex-1 text-center text-[9px] text-[var(--text-muted)]">
          {slot.hour % 6 === 0 ? `${String(slot.hour).padStart(2,"0")}h` : ""}
        </div>
      ))}
    </div>
    {/* Legend */}
    <div className="flex items-center gap-2 mt-2 justify-end">
      <span className="text-[10px] text-[var(--text-muted)]">Less</span>
      {[0.1, 0.3, 0.5, 0.7, 0.9].map(a => (
        <div
          key={a}
          className="w-4 h-3 rounded-sm"
          style={{ backgroundColor: `rgba(124, 58, 237, ${a})` }}
        />
      ))}
      <span className="text-[10px] text-[var(--text-muted)]">More</span>
    </div>
  </div>
);
