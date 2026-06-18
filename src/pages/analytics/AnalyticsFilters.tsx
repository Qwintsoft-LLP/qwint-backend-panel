import { useState } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PRESETS, type RangePreset, type DateRange } from "@/hooks/useAnalyticsData";

interface Props {
  preset:         RangePreset;
  setPreset:      (p: RangePreset) => void;
  customRange:    DateRange | null;
  setCustomRange: (r: DateRange) => void;
  appFilter:      string;
  setAppFilter:   (a: string) => void;
  availableApps:  string[];
  dataUpdatedAt:  number;
  refetch:        () => void;
  loading:        boolean;
}

export const AnalyticsFilters = ({
  preset, setPreset, customRange, setCustomRange,
  appFilter, setAppFilter, availableApps,
  dataUpdatedAt, refetch, loading,
}: Props) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [fromStr, setFromStr]       = useState("");
  const [toStr, setToStr]           = useState("");

  const applyCustom = () => {
    const from = new Date(fromStr);
    const to   = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) return;
    setCustomRange({ from, to });
    setPreset("custom");
    setCustomOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Date range preset pills */}
      <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]">
        {PRESETS.filter(p => p.key !== "custom").map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              preset === p.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {p.label}
          </button>
        ))}

        {/* Custom range picker */}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                preset === "custom"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <Calendar size={11} />
              {preset === "custom" && customRange
                ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
                : "Custom"
              }
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 p-3 bg-[var(--bg-elevated)] border-[var(--border)] space-y-3"
          >
            <p className="text-xs font-semibold text-[var(--text-primary)]">Custom Date Range</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">From</label>
                <Input
                  type="datetime-local"
                  value={fromStr}
                  onChange={e => setFromStr(e.target.value)}
                  className="h-8 text-xs mt-1 bg-[var(--bg-surface)]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">To</label>
                <Input
                  type="datetime-local"
                  value={toStr}
                  onChange={e => setToStr(e.target.value)}
                  className="h-8 text-xs mt-1 bg-[var(--bg-surface)]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={applyCustom}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 h-7 text-xs"
                onClick={() => setCustomOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* App filter */}
      <Select value={appFilter} onValueChange={setAppFilter}>
        <SelectTrigger className="h-8 w-40 text-xs bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectValue placeholder="All Apps" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectItem value="all" className="text-xs">All Apps</SelectItem>
          {availableApps.map(app => (
            <SelectItem key={app} value={app} className="text-xs">{app}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Last updated + refresh */}
      <div className="flex items-center gap-2 ml-auto">
        {dataUpdatedAt > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            Updated {format(dataUpdatedAt, "HH:mm:ss")}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => refetch()}
          disabled={loading}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  );
};
