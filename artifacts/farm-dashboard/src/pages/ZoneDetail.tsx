import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetZone, useListSensors, useGetSensorHistory,
  useListControls, useUpdateControl, useUpdateZone,
  getListControlsQueryKey, getGetSensorHistoryQueryKey, getListZonesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Thermometer, Droplets, FlaskConical, Sprout, ArrowLeft,
  Sun, Wind, Zap, Bot, Info, Activity, Sliders,
  LayoutGrid, LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip as RechartTooltip, CartesianGrid, Legend,
} from "recharts";
import { format, formatDistanceToNow } from "date-fns";
import { matchProfile, computeAutoControls, type ControlRecommendation } from "@/lib/plantProfiles";

type Tab = "overview" | "sensors" | "controls";
type GraphMode = "combined" | "separate";

const controlIcons: Record<string, React.ElementType> = {
  led_lighting: Sun,
  cooling_fan: Wind,
  water_pump: Droplets,
  nutrient_pump: FlaskConical,
};
const controlLabels: Record<string, string> = {
  led_lighting: "LED Lighting",
  cooling_fan: "Cooling Fan",
  water_pump: "Water Pump",
  nutrient_pump: "Nutrient Pump",
};
const controlColors: Record<string, string> = {
  led_lighting: "text-chart-1",
  cooling_fan: "text-chart-3",
  water_pump: "text-chart-2",
  nutrient_pump: "text-chart-4",
};

function SensorGauge({ value, min, max, optimal, unit, color }: {
  value: number; min: number; max: number; optimal: [number, number]; unit: string; color: string;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const inRange = value >= optimal[0] && value <= optimal[1];
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className={cn("text-lg font-bold font-mono", inRange ? color : "text-destructive")}>
          {value.toFixed(1)}<span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
        </span>
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full",
          inRange ? "bg-chart-2/20 text-chart-2" : "bg-destructive/20 text-destructive")}>
          {inRange ? "Optimal" : "Out of range"}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500",
          inRange ? "bg-chart-2" : "bg-destructive")} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>Optimal: {optimal[0]}–{optimal[1]}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

const CHART_STYLE = {
  grid: "hsl(140 15% 18%)",
  tick: { fontSize: 10, fill: "hsl(140 10% 60%)" },
  tooltip: { background: "hsl(140 16% 13%)", border: "1px solid hsl(140 15% 20%)", borderRadius: "8px", fontSize: "12px" },
};

const SENSOR_META = [
  { key: "Temperature", label: "Temperature", unit: "°C", color: "hsl(32 80% 55%)", stroke: "hsl(32 80% 55%)", min: 15, max: 40, optimal: [20, 28] as [number, number], gaugeColor: "text-chart-1", icon: Thermometer },
  { key: "Humidity", label: "Humidity", unit: "%", color: "hsl(190 60% 45%)", stroke: "hsl(190 60% 45%)", min: 30, max: 100, optimal: [55, 80] as [number, number], gaugeColor: "text-chart-3", icon: Droplets },
  { key: "Soil Moisture", label: "Soil Moisture", unit: "%", color: "hsl(140 40% 40%)", stroke: "hsl(140 40% 40%)", min: 0, max: 100, optimal: [50, 80] as [number, number], gaugeColor: "text-chart-2", icon: Sprout },
  { key: "pH", label: "pH Level", unit: " pH", color: "hsl(280 50% 50%)", stroke: "hsl(280 50% 50%)", min: 4, max: 9, optimal: [5.8, 6.8] as [number, number], gaugeColor: "text-chart-4", icon: FlaskConical },
];

export default function ZoneDetail() {
  const [, params] = useRoute("/zones/:id");
  const id = parseInt(params?.id ?? "0");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [graphMode, setGraphMode] = useState<GraphMode>("combined");
  const [localIntensity, setLocalIntensity] = useState<Record<number, number>>({});

  const { data: zone, isLoading: zoneLoading } = useGetZone(id, {
    query: { enabled: !!id },
  });
  const { data: sensors } = useListSensors();
  const { data: history } = useGetSensorHistory(
    { zoneId: id, limit: 24 },
    { query: { enabled: !!id, queryKey: getGetSensorHistoryQueryKey({ zoneId: id, limit: 24 }) } }
  );
  const { data: controls } = useListControls();
  const updateControl = useUpdateControl();
  const updateZone = useUpdateZone();

  const latestSensor = sensors?.find(s => s.zoneId === id);
  const zoneControls = controls?.filter(c => c.zoneId === id) ?? [];
  const isAutoMode = zone?.autoMode ?? false;

  const profile = zone ? matchProfile(zone.cropType) : null;
  const autoRecs: Record<string, ControlRecommendation> = {};
  if (isAutoMode && latestSensor && profile) {
    for (const r of computeAutoControls(latestSensor, profile)) autoRecs[r.type] = r;
  }

  const chartData = history?.slice().reverse().map(r => ({
    time: format(new Date(r.recordedAt), "HH:mm"),
    Temperature: Number(r.temperature.toFixed(1)),
    Humidity: Number(r.humidity.toFixed(1)),
    "Soil Moisture": Number(r.soilMoisture.toFixed(1)),
    pH: Number(r.phLevel.toFixed(2)),
  }));

  const handleToggle = (controlId: number, isActive: boolean) => {
    updateControl.mutate({ id: controlId, data: { isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() }),
    });
  };

  const handleIntensityCommit = (controlId: number, value: number) => {
    updateControl.mutate({ id: controlId, data: { intensity: value } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() }),
    });
  };

  const handleAutoModeToggle = (enabled: boolean) => {
    updateZone.mutate({ id, data: { autoMode: enabled } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListZonesQueryKey() });
        if (enabled && latestSensor && profile) {
          for (const rec of computeAutoControls(latestSensor, profile)) {
            const ctrl = zoneControls.find(c => c.type === rec.type);
            if (!ctrl) continue;
            updateControl.mutate(
              { id: ctrl.id, data: { isActive: rec.isActive, intensity: rec.intensity > 0 ? rec.intensity : (ctrl.intensity ?? 50) } },
              { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() }) }
            );
          }
        }
      },
    });
  };

  if (zoneLoading) return (
    <div className="p-6 space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
  );
  if (!zone) return <div className="p-6 text-muted-foreground">Zone not found.</div>;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "sensors", label: "Sensors", icon: Activity },
    { id: "controls", label: "Controls", icon: Sliders },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/zones">
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Farm Zones
          </button>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{zone.name}</span>
      </div>

      {/* Zone Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{zone.name}</h1>
            <Badge variant="outline" className={cn("text-xs",
              zone.status === "active" ? "border-chart-2/50 text-chart-2" :
              zone.status === "maintenance" ? "border-yellow-500/50 text-yellow-500" :
              "border-muted text-muted-foreground"
            )}>{zone.status}</Badge>
            {isAutoMode && (
              <Badge variant="outline" className="text-[10px] h-5 border-chart-2/50 text-chart-2 bg-chart-2/10">
                <Bot className="w-2.5 h-2.5 mr-1" /> Auto-Control
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {zone.cropType} · {zone.rackCount} racks
            {profile && <span className="ml-2 text-muted-foreground/60">— {profile.description}</span>}
          </p>
        </div>
        {latestSensor && (
          <div className="text-[10px] text-muted-foreground font-mono bg-card border border-card-border rounded-lg px-3 py-2">
            Last reading {formatDistanceToNow(new Date(latestSensor.recordedAt), { addSuffix: true })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tabId
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SENSOR_META.map(({ key, label, unit, gaugeColor, icon: Icon }) => {
              const value = latestSensor?.[key === "Temperature" ? "temperature" : key === "Humidity" ? "humidity" : key === "Soil Moisture" ? "soilMoisture" : "phLevel"];
              return (
                <div key={key} className="bg-card border border-card-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("w-4 h-4", gaugeColor)} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  {value === undefined ? <Skeleton className="h-7 w-16" /> : (
                    <div className="text-2xl font-bold font-mono">
                      {value.toFixed(key === "pH" ? 2 : 1)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick chart */}
          <div className="bg-card border border-card-border rounded-xl p-5">
            <h2 className="font-semibold mb-4 text-sm">24-Hour Trend — All Readings</h2>
            {!chartData ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
                  <XAxis dataKey="time" tick={CHART_STYLE.tick} tickLine={false} />
                  <YAxis tick={CHART_STYLE.tick} tickLine={false} axisLine={false} />
                  <RechartTooltip contentStyle={CHART_STYLE.tooltip} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {SENSOR_META.map(m => (
                    <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.stroke} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick controls summary */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Control Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {zoneControls.map(ctrl => {
                const Icon = controlIcons[ctrl.type] ?? Zap;
                const colorClass = controlColors[ctrl.type] ?? "text-muted-foreground";
                return (
                  <div key={ctrl.id} className={cn("border rounded-xl p-3 flex items-center gap-2 transition-colors",
                    ctrl.isActive ? "border-primary/30 bg-primary/5" : "border-card-border")}>
                    <Icon className={cn("w-4 h-4 flex-shrink-0", ctrl.isActive ? colorClass : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium leading-tight">{controlLabels[ctrl.type]}</div>
                      <div className={cn("text-[10px]", ctrl.isActive ? "text-chart-2" : "text-muted-foreground")}>
                        {ctrl.isActive ? `On ${ctrl.intensity != null ? `· ${ctrl.intensity}%` : ""}` : "Off"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SENSORS TAB ── */}
      {activeTab === "sensors" && (
        <div className="space-y-5">
          {/* Live gauge cards */}
          {latestSensor && (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-sm">Live Readings</h2>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(latestSensor.recordedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { meta: SENSOR_META[0], value: latestSensor.temperature },
                  { meta: SENSOR_META[1], value: latestSensor.humidity },
                  { meta: SENSOR_META[2], value: latestSensor.soilMoisture },
                  { meta: SENSOR_META[3], value: latestSensor.phLevel },
                ].map(({ meta, value }) => {
                  const Icon = meta.icon;
                  return (
                    <div key={meta.key}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={cn("w-3.5 h-3.5", meta.gaugeColor)} />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{meta.label}</span>
                      </div>
                      <SensorGauge
                        value={value}
                        min={meta.min}
                        max={meta.max}
                        optimal={meta.optimal}
                        unit={meta.unit}
                        color={meta.gaugeColor}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Graph mode toggle */}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">24-Hour History</h2>
            <div className="flex items-center gap-1 bg-card border border-card-border rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5", graphMode === "combined" && "bg-secondary text-foreground")}
                onClick={() => setGraphMode("combined")}
              >
                <LayoutList className="w-3 h-3" /> All in One
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5", graphMode === "separate" && "bg-secondary text-foreground")}
                onClick={() => setGraphMode("separate")}
              >
                <LayoutGrid className="w-3 h-3" /> Separate
              </Button>
            </div>
          </div>

          {!chartData ? (
            <Skeleton className="h-64 w-full" />
          ) : graphMode === "combined" ? (
            <div className="bg-card border border-card-border rounded-xl p-5">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
                  <XAxis dataKey="time" tick={CHART_STYLE.tick} tickLine={false} />
                  <YAxis tick={CHART_STYLE.tick} tickLine={false} axisLine={false} />
                  <RechartTooltip contentStyle={CHART_STYLE.tooltip} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {SENSOR_META.map(m => (
                    <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.stroke} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SENSOR_META.map(m => {
                const Icon = m.icon;
                return (
                  <div key={m.key} className="bg-card border border-card-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={cn("w-4 h-4", m.gaugeColor)} />
                      <h3 className="text-sm font-medium">{m.label}</h3>
                      <span className="text-[10px] text-muted-foreground ml-auto">{m.unit.trim()}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} />
                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: "hsl(140 10% 60%)" }} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(140 10% 60%)" }} tickLine={false} axisLine={false} width={30} />
                        <RechartTooltip contentStyle={{ ...CHART_STYLE.tooltip, fontSize: "11px" }} />
                        <Line type="monotone" dataKey={m.key} stroke={m.stroke} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTROLS TAB ── */}
      {activeTab === "controls" && (
        <div className="space-y-4">
          {/* Auto-control header */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Bot className={cn("w-4 h-4", isAutoMode ? "text-chart-2" : "text-muted-foreground")} />
                  <span className="text-sm font-semibold">Auto-Control</span>
                  {isAutoMode && (
                    <Badge variant="outline" className="text-[10px] h-5 border-chart-2/50 text-chart-2 bg-chart-2/10">Active</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAutoMode
                    ? `Managing controls automatically using the ${profile?.name ?? zone.cropType} plant profile`
                    : "Enable to let the system manage controls based on sensor readings and plant profile"}
                </p>
              </div>
              <Switch
                data-testid={`auto-mode-${id}`}
                checked={isAutoMode}
                onCheckedChange={handleAutoModeToggle}
                disabled={updateZone.isPending}
              />
            </div>

            {isAutoMode && profile && (
              <div className="px-5 py-3 bg-chart-2/5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Info className="w-3 h-3 text-chart-2" />
                  <span className="text-[10px] font-semibold text-chart-2 uppercase tracking-wide">
                    {profile.name} profile targets
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-muted-foreground font-mono">
                  <span>Temp: {profile.tempRange[0]}–{profile.tempRange[1]}°C</span>
                  <span>Humidity: {profile.humidityRange[0]}–{profile.humidityRange[1]}%</span>
                  <span>pH: {profile.phRange[0]}–{profile.phRange[1]}</span>
                  <span>Soil: {profile.soilMoistureRange[0]}–{profile.soilMoistureRange[1]}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Control cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zoneControls.length === 0
              ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)
              : zoneControls.map(control => {
                  const Icon = controlIcons[control.type] ?? Zap;
                  const colorClass = controlColors[control.type] ?? "text-muted-foreground";
                  const intensity = localIntensity[control.id] ?? control.intensity ?? 50;
                  const autoRec = autoRecs[control.type];

                  return (
                    <div key={control.id} data-testid={`control-card-${control.id}`}
                      className={cn("border rounded-xl p-4 transition-all duration-200",
                        control.isActive ? "border-primary/30 bg-primary/5" : "border-card-border bg-muted/10"
                      )}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          control.isActive ? "bg-primary/20" : "bg-muted/30"
                        )}>
                          <Icon className={cn("w-4 h-4", control.isActive ? colorClass : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{controlLabels[control.type]}</div>
                          <div className={cn("text-[10px] font-medium", control.isActive ? "text-chart-2" : "text-muted-foreground")}>
                            {control.isActive ? "Running" : "Off"}
                          </div>
                        </div>
                        {isAutoMode ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full cursor-default",
                                control.isActive ? "bg-chart-2/20 text-chart-2" : "bg-muted/30 text-muted-foreground"
                              )}>
                                <Bot className="w-2.5 h-2.5" />
                                {control.isActive ? "Auto ON" : "Auto OFF"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-56 text-xs">
                              {autoRec?.reason ?? "Managed automatically by plant profile"}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Switch
                            data-testid={`switch-control-${control.id}`}
                            checked={control.isActive}
                            onCheckedChange={(checked) => handleToggle(control.id, checked)}
                            disabled={updateControl.isPending}
                          />
                        )}
                      </div>

                      {isAutoMode && autoRec && (
                        <div className="text-[10px] text-muted-foreground italic pl-11 leading-snug mb-2">
                          {autoRec.reason}
                        </div>
                      )}

                      {control.intensity != null && control.isActive && !isAutoMode && (
                        <div className="space-y-2 mt-3 pt-3 border-t border-border">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Intensity</span>
                            <span className="text-xs font-mono font-semibold">{intensity}%</span>
                          </div>
                          <Slider
                            data-testid={`slider-control-${control.id}`}
                            value={[intensity]}
                            min={0} max={100} step={5}
                            onValueChange={([v]) => setLocalIntensity(prev => ({ ...prev, [control.id]: v }))}
                            onValueCommit={([v]) => handleIntensityCommit(control.id, v)}
                          />
                        </div>
                      )}

                      {isAutoMode && control.intensity != null && control.isActive && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Intensity</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-chart-2 rounded-full" style={{ width: `${autoRec?.intensity ?? control.intensity}%` }} />
                            </div>
                            <span className="text-[10px] font-mono">{autoRec?.intensity ?? control.intensity}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

function LayoutDashboard({ className }: { className?: string }) {
  return <Activity className={className} />;
}
