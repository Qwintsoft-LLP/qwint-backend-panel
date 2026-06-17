import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ColumnToggleProps {
  columns: { key: string; label: string; visible: boolean }[];
  onChange: (key: string, visible: boolean) => void;
}

export const ColumnToggle = ({ columns, onChange }: ColumnToggleProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
        <Settings2 size={12} />
        Columns
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-44 p-2 bg-[var(--bg-elevated)] border-[var(--border)]">
      {columns.map(col => (
        <label key={col.key} className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:bg-[var(--bg-hover)] rounded text-xs">
          <input
            type="checkbox"
            checked={col.visible}
            onChange={e => onChange(col.key, e.target.checked)}
            className="accent-[var(--accent)] w-3 h-3"
          />
          {col.label}
        </label>
      ))}
    </PopoverContent>
  </Popover>
);
