import { useGetDashboardSummary, useListAlerts, useListRecommendations, useListSensors } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Droplets, FlaskConical, Sprout, AlertTriangle, Lightbulb, Layers, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

function StatCard({ label, value, unit, icon: Icon, color }: {
  label: string; value: number | undefined; unit: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        {value === undefined ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <div className="text-xl font-bold font-mono">
            {value.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: alerts, isLoading: loadingAlerts } = useListAlerts({ status: "active" });
  const { data: recs } = useListRecommendations();
  const { data: sensors } = useListSensors();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Farm Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Real-time monitoring across all vertical farm zones</p>
      </div>

      {/* Zone summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4" data-testid="stat-total-zones">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Zones</span>
          </div>
          {loadingSummary ? <Skeleton className="h-8 w-12" /> : (
            <div className="text-3xl font-bold font-mono">{summary?.totalZones}</div>
          )}
          {!loadingSummary && <div className="text-xs text-muted-foreground mt-1">{summary?.activeZones} active</div>}
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4" data-testid="stat-active-alerts">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={cn("w-4 h-4", (summary?.criticalAlerts ?? 0) > 0 ? "text-destructive" : "text-primary")} />
            <span className="text-xs text-muted-foreground">Active Alerts</span>
          </div>
          {loadingSummary ? <Skeleton className="h-8 w-12" /> : (
            <div className={cn("text-3xl font-bold font-mono", (summary?.criticalAlerts ?? 0) > 0 && "text-destructive")}>
              {summary?.activeAlerts}
            </div>
          )}
          {!loadingSummary && <div className="text-xs text-muted-foreground mt-1">{summary?.criticalAlerts} critical</div>}
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4" data-testid="stat-active-controls">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-chart-2" />
            <span className="text-xs text-muted-foreground">Active Systems</span>
          </div>
          {loadingSummary ? <Skeleton className="h-8 w-12" /> : (
            <div className="text-3xl font-bold font-mono">{summary?.activeControls}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">of 12 controls</div>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-4" data-testid="stat-recommendations">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-chart-1" />
            <span className="text-xs text-muted-foreground">AI Insights</span>
          </div>
          {loadingSummary ? <Skeleton className="h-8 w-12" /> : (
            <div className="text-3xl font-bold font-mono">{summary?.pendingRecommendations}</div>
          )}
          <div className="text-xs text-muted-foreground mt-1">recommendations</div>
        </div>
      </div>

      {/* Avg sensor readings */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Average Sensor Readings</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Temperature" value={summary?.avgTemperature} unit="°C" icon={Thermometer} color="bg-chart-1/20 text-chart-1" />
          <StatCard label="Humidity" value={summary?.avgHumidity} unit="%" icon={Droplets} color="bg-chart-3/20 text-chart-3" />
          <StatCard label="pH Level" value={summary?.avgPhLevel} unit="pH" icon={FlaskConical} color="bg-chart-4/20 text-chart-4" />
          <StatCard label="Soil Moisture" value={summary?.avgSoilMoisture} unit="%" icon={Sprout} color="bg-chart-2/20 text-chart-2" />
        </div>
      </div>

      {/* Two columns: Alerts + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Active Alerts</h2>
            <Link href="/alerts"><span className="text-xs text-primary hover:underline cursor-pointer">View all</span></Link>
          </div>
          {loadingAlerts ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : alerts?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">All clear — no active alerts</div>
          ) : (
            <div className="space-y-2">
              {alerts?.slice(0, 4).map(alert => (
                <div key={alert.id} data-testid={`alert-item-${alert.id}`} className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  alert.severity === "critical" ? "border-destructive/30 bg-destructive/10" :
                  alert.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/10" :
                  "border-border bg-muted/30"
                )}>
                  <AlertTriangle className={cn("w-4 h-4 mt-0.5 flex-shrink-0",
                    alert.severity === "critical" ? "text-destructive" :
                    alert.severity === "warning" ? "text-yellow-500" : "text-muted-foreground"
                  )} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium leading-snug line-clamp-2">{alert.message}</div>
                    <Badge variant="outline" className="mt-1 text-[10px] h-4">{alert.severity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Recommendations */}
        <div className="bg-card border border-card-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">AI Recommendations</h2>
            <Link href="/recommendations"><span className="text-xs text-primary hover:underline cursor-pointer">View all</span></Link>
          </div>
          {!recs ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : recs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No recommendations at this time</div>
          ) : (
            <div className="space-y-2">
              {recs.slice(0, 3).map(rec => (
                <div key={rec.id} data-testid={`rec-item-${rec.id}`} className="p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-xs font-semibold leading-snug">{rec.title}</span>
                    <Badge variant="outline" className={cn("ml-auto text-[10px] h-4 flex-shrink-0",
                      rec.priority === "high" ? "border-destructive/50 text-destructive" :
                      rec.priority === "medium" ? "border-yellow-500/50 text-yellow-500" :
                      "border-muted text-muted-foreground"
                    )}>{rec.priority}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-5">{rec.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
