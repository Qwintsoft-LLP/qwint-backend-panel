import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  value:    string;
  onChange: (key: string) => void;
}

/**
 * KeySelector that fetches unique userId values from Langfuse traces.
 * Each userId corresponds to an API key that has generated LLM traces.
 * No backend /api/admin/keys dependency — works directly with Langfuse.
 */
export const KeySelector = ({ value, onChange }: Props) => {
  const { data: keys = [], isLoading } = useQuery<string[]>({
    queryKey: ["lf-available-keys"],
    queryFn: async () => {
      // Fetch recent traces and extract unique userIds
      // These represent API keys that have actually generated Langfuse traces
      const { data } = await langfuseClient.get("/api/public/traces", {
        params: { limit: 100, page: 1 },
      });

      const traces: { userId?: string | null }[] = data?.data ?? [];
      const userIds = new Set<string>();
      for (const t of traces) {
        if (t.userId) userIds.add(t.userId);
      }
      return Array.from(userIds).sort();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const maskKey = (k: string) =>
    k.length > 20 ? `${k.slice(0, 10)}...${k.slice(-6)}` : k;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-72 text-xs font-mono bg-[var(--bg-elevated)] border-[var(--border)]">
        <SelectValue placeholder={isLoading ? "Loading keys..." : "Select API key..."} />
      </SelectTrigger>
      <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)] max-h-64">
        {keys.map((key) => (
          <SelectItem key={key} value={key} className="text-xs">
            <span className="text-[var(--text-primary)] font-mono">{maskKey(key)}</span>
          </SelectItem>
        ))}
        {!isLoading && keys.length === 0 && (
          <div className="px-3 py-2 text-xs text-[var(--text-muted)]">
            No keys with traces found
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
