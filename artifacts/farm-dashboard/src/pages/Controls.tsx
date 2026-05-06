import { useListControls, useListZones, useUpdateControl, useUpdateZone, getListControlsQueryKey, getListZonesQueryKey, useListSensors } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sliders, Sun, Wind, Droplets, FlaskConical, Zap, Bot, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { matchProfile, computeAutoControls, type ControlRecommendation } from "@/lib/plantProfiles";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

export default function Controls() {
  const queryClient = useQueryClient();
  const { data: controls, isLoading } = useListControls();
  const { data: zones } = useListZones();
  const { data: sensors } = useListSensors();
  const updateControl = useUpdateControl();
  const updateZone = useUpdateZone();
  const [localIntensity, setLocalIntensity] = useState<Record<number, number>>({});

  const getZone = (zoneId: number) => zones?.find(z => z.id === zoneId);

  const handleToggle = (id: number, isActive: boolean) => {
    updateControl.mutate({ id, data: { isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() })
    });
  };

  const handleIntensityCommit = (id: number, value: number) => {
    updateControl.mutate({ id, data: { intensity: value } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() })
    });
  };

  const handleAutoModeToggle = (zoneId: number, enabled: boolean) => {
    updateZone.mutate({ id: zoneId, data: { autoMode: enabled } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListZonesQueryKey() });
        // If enabling auto mode, apply recommended control states immediately
        if (enabled) {
          applyAutoControls(zoneId);
        }
      }
    });
  };

  const applyAutoControls = (zoneId: number) => {
    const zone = zones?.find(z => z.id === zoneId);
    const sensor = sensors?.find(s => s.zoneId === zoneId);
    const zoneControls = controls?.filter(c => c.zoneId === zoneId);
    if (!zone || !sensor || !zoneControls) return;

    const profile = matchProfile(zone.cropType);
    const recs = computeAutoControls(sensor, profile);

    for (const rec of recs) {
      const ctrl = zoneControls.find(c => c.type === rec.type);
      if (!ctrl) continue;
      updateControl.mutate({ id: ctrl.id, data: { isActive: rec.isActive, intensity: rec.intensity > 0 ? rec.intensity : ctrl.intensity } }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() })
      });
    }
  };

  // Group controls by zone
  const byZone = controls?.reduce<Record<number, typeof controls>>((acc, c) => {
    acc[c.zoneId] = acc[c.zoneId] ?? [];
    acc[c.zoneId].push(c);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sliders className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Control Systems</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage LED lighting, fans, pumps — manually or via Auto-Control</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-56 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byZone ?? {}).map(([zoneIdStr, zoneControls]) => {
            const zoneId = parseInt(zoneIdStr);
            const zone = getZone(zoneId);
            const sensor = sensors?.find(s => s.zoneId === zoneId);
            const isAutoMode = zone?.autoMode ?? false;

            const profile = zone ? matchProfile(zone.cropType) : null;
            const autoRecs: Record<string, ControlRecommendation> = {};
            if (isAutoMode && sensor && profile) {
              const recs = computeAutoControls(sensor, profile);
              for (const r of recs) autoRecs[r.type] = r;
            }

            return (
              <div key={zoneId} className="bg-card border border-card-border rounded-xl overflow-hidden">
                {/* Zone header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{zone?.name ?? `Zone ${zoneId}`}</span>
                      <Badge variant="outline" className="text-[10px] h-5 border-muted text-muted-foreground">
                        {zone?.cropType}
                      </Badge>
                      {isAutoMode && (
                        <Badge variant="outline" className="text-[10px] h-5 border-chart-2/50 text-chart-2 bg-chart-2/10">
                          <Bot className="w-2.5 h-2.5 mr-1" /> Auto-Control Active
                        </Badge>
                      )}
                    </div>
                    {profile && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Profile: {profile.name} — {profile.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Bot className={cn("w-4 h-4", isAutoMode ? "text-chart-2" : "text-muted-foreground")} />
                    <span className="text-xs text-muted-foreground">Auto-Control</span>
                    <Switch
                      data-testid={`auto-mode-${zoneId}`}
                      checked={isAutoMode}
                      onCheckedChange={(checked) => handleAutoModeToggle(zoneId, checked)}
                      disabled={updateZone.isPending}
                    />
                  </div>
                </div>

                {/* Plant profile targets banner */}
                {isAutoMode && profile && (
                  <div className="px-5 py-3 bg-chart-2/5 border-b border-chart-2/20">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Info className="w-3 h-3 text-chart-2" />
                      <span className="text-[10px] font-semibold text-chart-2 uppercase tracking-wide">
                        Auto-managing based on {profile.name} profile targets
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

                {/* Control cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
                  {zoneControls.map(control => {
                    const Icon = controlIcons[control.type] ?? Sliders;
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
                                <div className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full",
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

                        {/* Auto reason pill */}
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
                              min={0}
                              max={100}
                              step={5}
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
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
