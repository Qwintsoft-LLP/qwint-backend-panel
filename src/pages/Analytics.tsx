import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { PageHeader }        from "@/components/shared/PageHeader";
import { AnalyticsFilters }  from "./analytics/AnalyticsFilters";
import { KpiStrip }          from "./analytics/KpiStrip";
import { ChartCard }         from "./analytics/ChartCard";
import { CreditBurnChart }   from "./analytics/charts/CreditBurnChart";
import { RequestVolumeChart }from "./analytics/charts/RequestVolumeChart";
import { PieBreakdown }      from "./analytics/charts/PieBreakdown";
import { TopKeysChart }      from "./analytics/charts/TopKeysChart";
import { ResponseTimeChart } from "./analytics/charts/ResponseTimeChart";
import { BudgetHealthBars }  from "./analytics/charts/BudgetHealthBars";
import { HourlyHeatmap }     from "./analytics/charts/HourlyHeatmap";

export default function Analytics() {
  const d = useAnalyticsData();

  return (
    <div className="space-y-3 p-4">

      {/* Header */}
      <PageHeader
        title="Analytics"
        subtitle={`${d.kpis.total.toLocaleString()} events in selected range`}
        actions={
          <AnalyticsFilters
            preset={d.preset}          setPreset={d.setPreset}
            customRange={d.customRange} setCustomRange={d.setCustomRange}
            appFilter={d.appFilter}    setAppFilter={d.setAppFilter}
            availableApps={d.availableApps}
            dataUpdatedAt={d.dataUpdatedAt}
            refetch={d.refetch}
            loading={d.loading}
          />
        }
      />

      {/* KPI strip */}
      <KpiStrip kpis={d.kpis} />

      {/* Row 1 — Credit burn + Request volume */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <ChartCard
          title="Credit Burn Over Time"
          subtitle="Credits deducted per time bucket"
          className="lg:col-span-3"
          height={220}
          loading={d.loading}
          empty={d.creditBurnSeries.length < 2}
          emptyMsg="Not enough data points — try a wider range"
        >
          <CreditBurnChart data={d.creditBurnSeries} />
        </ChartCard>

        <ChartCard
          title="Request Volume"
          subtitle="Success / warn / error by time bucket"
          className="lg:col-span-2"
          height={220}
          loading={d.loading}
          empty={d.requestVolumeSeries.length === 0}
        >
          <RequestVolumeChart data={d.requestVolumeSeries} />
        </ChartCard>
      </div>

      {/* Row 2 — Three pies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard
          title="Log Level Distribution"
          subtitle="INFO / WARN / ERROR breakdown"
          height={200}
          loading={d.loading}
          empty={d.levelBreakdown.length === 0}
        >
          <PieBreakdown data={d.levelBreakdown} donut />
        </ChartCard>

        <ChartCard
          title="Success vs Error"
          subtitle="Overall request outcome"
          height={200}
          loading={d.loading}
          empty={d.successFailSplit.length === 0}
        >
          <PieBreakdown data={d.successFailSplit} donut />
        </ChartCard>

        <ChartCard
          title="Traffic by App"
          subtitle="Request share per application"
          height={200}
          loading={d.loading}
          empty={d.appSplit.length === 0}
        >
          <PieBreakdown data={d.appSplit} />
        </ChartCard>
      </div>

      {/* Row 3 — Top keys + Response time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Top API Keys by Credits Used"
          subtitle="Top consuming keys in range"
          height={220}
          loading={d.loading}
          empty={d.topKeysByCredits.length === 0}
          emptyMsg="No credit usage in this range"
        >
          <TopKeysChart data={d.topKeysByCredits} />
        </ChartCard>

        <ChartCard
          title="Response Time Distribution"
          subtitle="Number of requests per latency bucket"
          height={220}
          loading={d.loading}
          empty={d.responseTimeDist.every(b => b.count === 0)}
          emptyMsg="No timed requests in this range"
        >
          <ResponseTimeChart data={d.responseTimeDist} />
        </ChartCard>
      </div>

      {/* Row 4 — Hourly heatmap */}
      <ChartCard
        title="Traffic Heatmap"
        subtitle="Request density by hour of day (all days in range combined)"
        height={80}
        loading={d.loading}
        empty={d.hourlyHeatmap.every(h => h.count === 0)}
        emptyMsg="No data for heatmap"
      >
        <HourlyHeatmap data={d.hourlyHeatmap} />
      </ChartCard>

      {/* Row 5 removed (RawEventsTable) */}

      {/* Row 6 — Budget health */}
      <ChartCard
        title="Budget Health by Key"
        subtitle="Remaining budget % for all active keys"
        height="auto"
        loading={d.loading}
        empty={d.budgetHealth.length === 0}
        emptyMsg="No active API keys"
      >
        <BudgetHealthBars data={d.budgetHealth} />
      </ChartCard>
    </div>
  );
}
