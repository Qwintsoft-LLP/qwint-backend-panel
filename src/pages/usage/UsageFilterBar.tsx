import { useState } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, maskString } from "@/lib/utils";
import type { UsagePreset, UsageDateRange } from "@/hooks/useUsageData";
import type { ApiKey } from "@/hooks/useApiKeys";

const PRESETS: { key: UsagePreset; label: string }[] = [
  { key: "1h",  label: "1h"  },
  { key: "6h",  label: "6h"  },
  { key: "24h", label: "24h" },   // ← default, visually first
  { key: "7d",  label: "7d"  },
  { key: "30d", label: "30d" },
];

interface Props {
  preset:         UsagePreset;
  setPreset:      (p: UsagePreset) => void;
  customRange:    UsageDateRange | null;
  setCustomRange: (r: UsageDateRange) => void;
  appFilter:      string;
  setAppFilter:   (a: string) => void;
  keyFilter:      string;
  setKeyFilter:   (k: string) => void;
  availableApps:  string[];
  keys:           ApiKey[];
  loading:        boolean;
  onRefresh:      () => void;
  dataUpdatedAt:  number;
}

export const UsageFilterBar = ({
  preset, setPreset, customRange, setCustomRange,
  appFilter, setAppFilter, keyFilter, setKeyFilter,
  availableApps, keys, loading, onRefresh, dataUpdatedAt,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");

  const applyCustom = () => {
    const f = new Date(from), t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || f >= t) return;
    setCustomRange({ from: f, to: t });
    setPreset("custom");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Time presets */}
      <div className="flex items-center h-8 border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-elevated)]">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              "px-3 h-full text-xs font-medium transition-colors border-r border-[var(--border)] last:border-r-0",
              preset === p.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {p.label}
          </button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors",
              preset === "custom"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}>
              <Calendar size={11} />
              {preset === "custom" && customRange
                ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
                : "Custom"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3 bg-[var(--bg-elevated)] border-[var(--border)] space-y-3">
            <p className="text-xs font-semibold">Custom Range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">From</label>
                <Input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">To</label>
                <Input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={applyCustom}>Apply</Button>
              <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* App filter */}
      <Select value={appFilter} onValueChange={setAppFilter}>
        <SelectTrigger className="h-8 w-32 text-xs bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectValue placeholder="All Apps" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectItem value="all" className="text-xs">All Apps</SelectItem>
          {availableApps.map(app => (
            <SelectItem key={app} value={app} className="text-xs">{app}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Key filter */}
      <Select value={keyFilter} onValueChange={setKeyFilter}>
        <SelectTrigger className="h-8 w-40 text-xs bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectValue placeholder="All Keys" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)] max-h-60">
          <SelectItem value="all" className="text-xs">All Keys</SelectItem>
          {keys.map(k => (
            <SelectItem key={k.key} value={k.key} className="text-xs font-mono">
              {k.username} · {maskString(k.key, 6)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 ml-auto">
        {dataUpdatedAt > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            Updated {format(dataUpdatedAt, "HH:mm:ss")}
          </span>
        )}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  );
};
