import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApiKeyOption {
  key:      string;
  username: string;
}

interface Props {
  value:    string;
  onChange: (key: string) => void;
}

export const KeySelector = ({ value, onChange }: Props) => {
  const { data: keys = [] } = useQuery<ApiKeyOption[]>({
    queryKey: ["admin-keys"],
    queryFn:  () => apiClient.get("/api/admin/keys").then(r => r.data?.keys ?? r.data ?? []),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const maskKey = (k: string) => k.length > 16 ? `${k.slice(0, 8)}...${k.slice(-4)}` : k;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-72 text-xs font-mono bg-[var(--bg-elevated)] border-[var(--border)]">
        <SelectValue placeholder="Select API key..." />
      </SelectTrigger>
      <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)] max-h-64">
        {keys.map((k: ApiKeyOption) => (
          <SelectItem key={k.key} value={k.key} className="text-xs">
            <span className="text-[var(--text-primary)] font-medium">{k.username}</span>
            <span className="ml-2 text-[var(--text-muted)] font-mono">{maskKey(k.key)}</span>
          </SelectItem>
        ))}
        {keys.length === 0 && (
          <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No keys found</div>
        )}
      </SelectContent>
    </Select>
  );
};
