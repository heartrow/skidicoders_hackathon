import { useRoute, Link } from "wouter";
import { useGetZone, useListSensors, useGetSensorHistory, useListControls, useUpdateControl, getListControlsQueryKey, getGetSensorHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Thermometer, Droplets, FlaskConical, Sprout, ArrowLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

const controlLabels: Record<string, string> = {
  led_lighting: "LED Lighting",
  cooling_fan: "Cooling Fan",
  water_pump: "Water Pump",
  nutrient_pump: "Nutrient Pump",
};

export default function ZoneDetail() {
  const [, params] = useRoute("/zones/:id");
  const id = parseInt(params?.id ?? "0");
  const queryClient = useQueryClient();

  const { data: zone, isLoading: zoneLoading } = useGetZone(id, { query: { enabled: !!id, queryKey: useGetZone.name ? [id] : [id] } });
  const { data: sensors } = useListSensors();
  const { data: history } = useGetSensorHistory({ zoneId: id, limit: 24 }, { query: { enabled: !!id, queryKey: getGetSensorHistoryQueryKey({ zoneId: id, limit: 24 }) } });
  const { data: controls } = useListControls();
  const updateControl = useUpdateControl();

  const latestSensor = sensors?.find(s => s.zoneId === id);
  const zoneControls = controls?.filter(c => c.zoneId === id);

  const chartData = history
    ?.slice()
    .reverse()
    .map(r => ({
      time: format(new Date(r.recordedAt), "HH:mm"),
      Temperature: Number(r.temperature.toFixed(1)),
      Humidity: Number(r.humidity.toFixed(1)),
      "Soil Moisture": Number(r.soilMoisture.toFixed(1)),
      pH: Number(r.phLevel.toFixed(2)),
    }));

  const handleToggle = (controlId: number, isActive: boolean) => {
    updateControl.mutate({ id: controlId, data: { isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() })
    });
  };

  if (zoneLoading) return <div className="p-6 space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (!zone) return <div className="p-6 text-muted-foreground">Zone not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/zones">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-zones">
            <ArrowLeft className="w-3.5 h-3.5" /> Zones
          </button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{zone.name}</span>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{zone.name}</h1>
        <Badge variant="outline" className={cn("text-xs",
          zone.status === "active" ? "border-chart-2/50 text-chart-2" :
          zone.status === "maintenance" ? "border-yellow-500/50 text-yellow-500" :
          "border-muted text-muted-foreground"
        )}>{zone.status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">{zone.cropType} · {zone.rackCount} racks</p>

      {/* Latest Sensor Readings */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Readings</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Temperature", value: latestSensor?.temperature, unit: "°C", icon: Thermometer, color: "text-chart-1" },
            { label: "Humidity", value: latestSensor?.humidity, unit: "%", icon: Droplets, color: "text-chart-3" },
            { label: "pH Level", value: latestSensor?.phLevel, unit: "pH", icon: FlaskConical, color: "text-chart-4" },
            { label: "Soil Moisture", value: latestSensor?.soilMoisture, unit: "%", icon: Sprout, color: "text-chart-2" },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-card-border rounded-xl p-4" data-testid={`sensor-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("w-4 h-4", color)} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              {value === undefined ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold font-mono">
                  {value.toFixed(1)}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* History Chart */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-semibold mb-4">24-Hour History</h2>
        {!chartData ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(140 15% 18%)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(140 10% 60%)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(140 10% 60%)" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(140 16% 13%)", border: "1px solid hsl(140 15% 20%)", borderRadius: "8px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="Temperature" stroke="hsl(32 80% 55%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Humidity" stroke="hsl(190 60% 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Soil Moisture" stroke="hsl(140 40% 40%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pH" stroke="hsl(280 50% 50%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Controls */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Control Systems</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!zoneControls ? [1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />) :
            zoneControls.map(control => (
              <div key={control.id} data-testid={`control-${control.type}`} className={cn(
                "bg-card border rounded-xl p-4 flex items-center gap-3 transition-colors",
                control.isActive ? "border-primary/30 bg-primary/5" : "border-card-border"
              )}>
                <Zap className={cn("w-4 h-4 flex-shrink-0", control.isActive ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{controlLabels[control.type] ?? control.type}</div>
                  {control.intensity != null && (
                    <div className="text-xs text-muted-foreground">Intensity: {control.intensity}%</div>
                  )}
                </div>
                <Switch
                  data-testid={`switch-${control.type}`}
                  checked={control.isActive}
                  onCheckedChange={(checked) => handleToggle(control.id, checked)}
                  disabled={updateControl.isPending}
                />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
