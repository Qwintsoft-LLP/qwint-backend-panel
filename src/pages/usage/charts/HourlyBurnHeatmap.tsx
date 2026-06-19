export const HourlyBurnHeatmap = ({ data }: { data: { hour: number; credits: number; requests: number; intensity: number }[] }) => (
  <div>
    <div className="flex gap-1">
      {data.map(slot => (
        <div key={slot.hour} className="flex-1 min-w-0 group relative" title={`${String(slot.hour).padStart(2,"0")}:00`}>
          <div
            className="h-9 rounded-sm transition-all"
            style={{ backgroundColor: `rgba(124, 58, 237, ${0.08 + slot.intensity * 0.85})` }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            <div className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] whitespace-nowrap shadow-md">
              <p className="font-semibold">{String(slot.hour).padStart(2,"0")}:00</p>
              <p>{slot.credits.toFixed(1)} credits</p>
              <p>{slot.requests} requests</p>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="flex gap-1 mt-1">
      {data.map(slot => (
        <div key={slot.hour} className="flex-1 text-center text-[9px] text-[var(--text-muted)]">
          {slot.hour % 6 === 0 ? `${String(slot.hour).padStart(2,"0")}h` : ""}
        </div>
      ))}
    </div>
  </div>
);
