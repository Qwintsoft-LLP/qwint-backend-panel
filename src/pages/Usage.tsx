import { useUsageData } from "@/hooks/useUsageData";
import { PageHeader } from "@/components/shared/PageHeader";
import { UsageFilterBar }  from "./usage/UsageFilterBar";
import { UsageKpis }       from "./usage/UsageKpis";
import { UsageCard }       from "./usage/UsageCard";
import { CreditUsageChart }    from "./usage/charts/CreditUsageChart";
import { CreditsByAppChart }   from "./usage/charts/CreditsByAppChart";
import { TokenUsageChart }     from "./usage/charts/TokenUsageChart";
import { HourlyBurnHeatmap }   from "./usage/charts/HourlyBurnHeatmap";
import { PerKeyUsageTable }    from "./usage/PerKeyUsageTable";

export default function UsagePage() {
  const u = useUsageData();

  return (
    <div className="space-y-3">
      <PageHeader
        title="Usage Overview"
        subtitle={`${u.presetLabel} · ${u.totalRequests.toLocaleString()} requests`}
      />

      <UsageFilterBar
        preset={u.preset} setPreset={u.setPreset}
        customRange={u.customRange} setCustomRange={u.setCustomRange}
        appFilter={u.appFilter} setAppFilter={u.setAppFilter}
        keyFilter={u.keyFilter} setKeyFilter={u.setKeyFilter}
        availableApps={u.availableApps} keys={u.keys}
        loading={u.loading} onRefresh={u.refetch} dataUpdatedAt={u.dataUpdatedAt}
      />

      <UsageKpis
        totalCredits={u.totalCredits}
        totalRequests={u.totalRequests}
        tokenStats={u.tokenStats}
        loading={u.loading}
      />

      {/* Row 1: Credit usage over time + by app */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <UsageCard title="Credit Usage Over Time" subtitle="Total credits deducted per period" className="lg:col-span-2" height={240} loading={u.loading}>
          <CreditUsageChart data={u.creditTimeSeries} />
        </UsageCard>
        <UsageCard title="Credits by App" height={240} loading={u.loading}>
          <CreditsByAppChart data={u.creditsByApp} />
        </UsageCard>
      </div>

      {/* Row 2: Per-key table */}
      <UsageCard title="Usage by API Key" subtitle="Sorted by credits used, descending" height="auto" loading={u.loading}>
        <PerKeyUsageTable data={u.perKeyUsage} loading={u.loading} />
      </UsageCard>

      {/* Row 3: Token usage */}
      <div className="grid grid-cols-1 gap-3">
        <UsageCard
          title="Token Usage Over Time"
          subtitle="Input vs output tokens, daily"
          height={240}
          loading={u.loading}
        >
          <TokenUsageChart data={u.tokenTimeSeries} />
        </UsageCard>
      </div>

      {/* Row 4: Hourly heatmap */}
      <UsageCard title="Hourly Burn Pattern" subtitle="Credit usage by hour of day, all days in range combined" height={90} loading={u.loading}>
        <HourlyBurnHeatmap data={u.hourlyBurn} />
      </UsageCard>

    </div>
  );
}
