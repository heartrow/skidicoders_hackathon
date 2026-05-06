import { useState } from "react";
import { useGetResourceAnalytics, useGetMonthlyTrends, useListZones } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Zap, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const ZONE_COLORS = ["hsl(32 80% 55%)", "hsl(140 40% 40%)", "hsl(190 60% 45%)", "hsl(280 50% 50%)"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1];
const MONTHS = [
  { value: "0", label: "Full Year" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(140 16% 13%)",
    border: "1px solid hsl(140 15% 20%)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(140 20% 90%)",
  },
};

function StatCard({ label, value, unit, icon: Icon, color, sub }: {
  label: string; value: string | number | undefined; unit: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        {value === undefined ? <Skeleton className="h-6 w-20" /> : (
          <div className="text-xl font-bold font-mono">
            {value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </div>
        )}
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [selectedMonth, setSelectedMonth] = useState("0");

  const { data: zones } = useListZones();

  const resourceParams = {
    year: parseInt(selectedYear),
    ...(selectedMonth !== "0" ? { month: parseInt(selectedMonth) } : {}),
  };

  const { data: resourceData, isLoading: loadingResource } = useGetResourceAnalytics(resourceParams, {
    query: { queryKey: ["resource-analytics", selectedYear, selectedMonth] }
  });
  const { data: monthlyData, isLoading: loadingMonthly } = useGetMonthlyTrends(
    { year: parseInt(selectedYear) },
    { query: { queryKey: ["monthly-trends", selectedYear] } }
  );

  // Totals across all zones
  const totalPower = resourceData?.reduce((s, z) => s + z.totalPowerKwh, 0) ?? 0;
  const totalCost = resourceData?.reduce((s, z) => s + z.totalCostUsd, 0) ?? 0;
  const totalDays = resourceData?.[0]?.days ?? 0;

  // Monthly trend chart data — flatten zones as series
  const zoneNames = zones?.map(z => z.name) ?? [];
  const monthlyChartData = monthlyData?.map(m => {
    const row: Record<string, number | string> = { label: m.label, month: m.month };
    for (const z of m.zones) {
      row[`${z.zoneName} (kWh)`] = parseFloat(z.powerKwh.toFixed(2));
      row[`${z.zoneName} ($)`] = parseFloat(z.costUsd.toFixed(2));
    }
    row["Total kWh"] = parseFloat(m.totalPowerKwh.toFixed(2));
    row["Total $"] = parseFloat(m.totalCostUsd.toFixed(2));
    return row;
  });

  // Per-zone bar chart data
  const zoneBarData = resourceData?.map(z => ({
    name: z.zoneName,
    "Power (kWh)": parseFloat(z.totalPowerKwh.toFixed(2)),
    "Cost ($)": parseFloat(z.totalCostUsd.toFixed(2)),
    "Avg Daily kWh": parseFloat(z.avgDailyPowerKwh.toFixed(2)),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Resource consumption, cost tracking and growth trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Power Used"
          value={loadingResource ? undefined : totalPower.toFixed(1)}
          unit="kWh"
          icon={Zap}
          color="bg-chart-1/20 text-chart-1"
          sub={`${totalDays} days tracked`}
        />
        <StatCard
          label="Total Cost"
          value={loadingResource ? undefined : `$${totalCost.toFixed(2)}`}
          unit=""
          icon={DollarSign}
          color="bg-chart-2/20 text-chart-2"
          sub="at $0.12/kWh tariff"
        />
        <StatCard
          label="Avg Daily Power"
          value={loadingResource ? undefined : (totalDays > 0 ? (totalPower / totalDays).toFixed(2) : "0.00")}
          unit="kWh/day"
          icon={TrendingUp}
          color="bg-chart-3/20 text-chart-3"
          sub="across all zones"
        />
        <StatCard
          label="Avg Daily Cost"
          value={loadingResource ? undefined : `$${totalDays > 0 ? (totalCost / totalDays).toFixed(2) : "0.00"}`}
          unit=""
          icon={DollarSign}
          color="bg-chart-4/20 text-chart-4"
          sub="across all zones"
        />
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
          <TabsTrigger value="zones">Zone Breakdown</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
        </TabsList>

        {/* Monthly Trends */}
        <TabsContent value="monthly" className="mt-4 space-y-4">
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Monthly Power Consumption — {selectedYear}</h2>
            <p className="text-xs text-muted-foreground mb-4">Total kWh consumed per month across all zones</p>
            {loadingMonthly ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyChartData}>
                  <defs>
                    {zoneNames.map((name, i) => (
                      <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ZONE_COLORS[i % ZONE_COLORS.length]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ZONE_COLORS[i % ZONE_COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140 15% 18%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} axisLine={false} unit=" kWh" />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {zoneNames.map((name, i) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={`${name} (kWh)`}
                      stroke={ZONE_COLORS[i % ZONE_COLORS.length]}
                      fill={`url(#grad-${i})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Monthly Cost — {selectedYear}</h2>
            <p className="text-xs text-muted-foreground mb-4">Running electricity cost (USD) per month</p>
            {loadingMonthly ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140 15% 18%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {zoneNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={`${name} ($)`}
                      stroke={ZONE_COLORS[i % ZONE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                  <Line type="monotone" dataKey="Total $" stroke="hsl(32 80% 55%)" strokeWidth={2.5} strokeDasharray="5 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>

        {/* Zone Breakdown */}
        <TabsContent value="zones" className="mt-4 space-y-4">
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Power Consumption by Zone</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {selectedMonth !== "0" ? MONTHS[parseInt(selectedMonth)]?.label : "Full year"} {selectedYear} — kWh consumed per zone
            </p>
            {loadingResource ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={zoneBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140 15% 18%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} unit=" kWh" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} width={90} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="Power (kWh)" fill="hsl(32 80% 55%)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Avg Daily kWh" fill="hsl(140 40% 40%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Per-zone resource cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loadingResource
              ? [1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full" />)
              : resourceData?.map((z, i) => (
                  <div key={z.zoneId} className="bg-card border border-card-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                      <span className="text-sm font-semibold">{z.zoneName}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Total Power</span>
                        <span className="font-mono font-semibold text-xs">{z.totalPowerKwh.toFixed(1)} kWh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Total Cost</span>
                        <span className="font-mono font-semibold text-xs text-primary">${z.totalCostUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Avg/Day</span>
                        <span className="font-mono text-xs">{z.avgDailyPowerKwh.toFixed(2)} kWh · ${z.avgDailyCostUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Days Tracked</span>
                        <span className="font-mono text-xs">{z.days}</span>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </TabsContent>

        {/* Cost Analysis */}
        <TabsContent value="cost" className="mt-4 space-y-4">
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Cumulative Cost Trend</h2>
            <p className="text-xs text-muted-foreground mb-4">Stacked monthly costs per zone — {selectedYear}</p>
            {loadingMonthly ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(140 15% 18%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {zoneNames.map((name, i) => (
                    <Bar
                      key={name}
                      dataKey={`${name} ($)`}
                      stackId="cost"
                      fill={ZONE_COLORS[i % ZONE_COLORS.length]}
                      radius={i === zoneNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Year-over-year comparison placeholder */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-1">Year-on-Year Comparison</h2>
            <p className="text-xs text-muted-foreground mb-4">Total monthly cost — {CURRENT_YEAR - 1} vs {CURRENT_YEAR}</p>
            <YearComparisonChart currentYear={CURRENT_YEAR} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function YearComparisonChart({ currentYear }: { currentYear: number }) {
  const { data: current } = useGetMonthlyTrends({ year: currentYear }, { query: { queryKey: ["monthly-trends", String(currentYear)] } });
  const { data: prev } = useGetMonthlyTrends({ year: currentYear - 1 }, { query: { queryKey: ["monthly-trends", String(currentYear - 1)] } });

  const MONTH_LABELS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const chartData = MONTH_LABELS_SHORT.map((label, idx) => {
    const month = idx + 1;
    const curItem = current?.find(m => m.month === month);
    const prevItem = prev?.find(m => m.month === month);
    return {
      label,
      [String(currentYear)]: curItem ? parseFloat(curItem.totalCostUsd.toFixed(2)) : null,
      [String(currentYear - 1)]: prevItem ? parseFloat(prevItem.totalCostUsd.toFixed(2)) : null,
    };
  });

  if (!current && !prev) return <Skeleton className="h-52 w-full" />;

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(140 15% 18%)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "hsl(140 10% 60%)" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
        <Tooltip
          contentStyle={{ background: "hsl(140 16% 13%)", border: "1px solid hsl(140 15% 20%)", borderRadius: "8px", fontSize: "12px", color: "hsl(140 20% 90%)" }}
          formatter={(v: number) => `$${Number(v).toFixed(2)}`}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        <Bar dataKey={String(currentYear - 1)} fill="hsl(140 15% 30%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey={String(currentYear)} fill="hsl(32 80% 55%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
