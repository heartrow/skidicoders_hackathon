import { useListControls, useListZones, useUpdateControl, getListControlsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Sliders, Sun, Wind, Droplets, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const updateControl = useUpdateControl();
  const [localIntensity, setLocalIntensity] = useState<Record<number, number>>({});

  const getZoneName = (zoneId: number) => zones?.find(z => z.id === zoneId)?.name ?? `Zone ${zoneId}`;

  const handleToggle = (id: number, isActive: boolean) => {
    updateControl.mutate({ id, data: { isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() })
    });
  };

  const handleIntensityChange = (id: number, value: number) => {
    setLocalIntensity(prev => ({ ...prev, [id]: value }));
  };

  const handleIntensityCommit = (id: number, value: number) => {
    updateControl.mutate({ id, data: { intensity: value } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListControlsQueryKey() })
    });
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
          <p className="text-muted-foreground text-sm mt-0.5">Manage LED lighting, fans, pumps and nutrient delivery</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byZone ?? {}).map(([zoneIdStr, zoneControls]) => {
            const zoneId = parseInt(zoneIdStr);
            return (
              <div key={zoneId} className="bg-card border border-card-border rounded-xl p-5">
                <h2 className="font-semibold text-sm mb-4">{getZoneName(zoneId)}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {zoneControls.map(control => {
                    const Icon = controlIcons[control.type] ?? Sliders;
                    const colorClass = controlColors[control.type] ?? "text-muted-foreground";
                    const intensity = localIntensity[control.id] ?? control.intensity ?? 50;

                    return (
                      <div key={control.id} data-testid={`control-card-${control.id}`}
                        className={cn("border rounded-xl p-4 transition-all duration-200",
                          control.isActive ? "border-primary/30 bg-primary/5" : "border-card-border bg-muted/10"
                        )}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            control.isActive ? "bg-primary/20" : "bg-muted/30"
                          )}>
                            <Icon className={cn("w-4 h-4", control.isActive ? colorClass : "text-muted-foreground")} />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{controlLabels[control.type]}</div>
                            <div className={cn("text-[10px] font-medium", control.isActive ? "text-chart-2" : "text-muted-foreground")}>
                              {control.isActive ? "Running" : "Off"}
                            </div>
                          </div>
                          <Switch
                            data-testid={`switch-control-${control.id}`}
                            checked={control.isActive}
                            onCheckedChange={(checked) => handleToggle(control.id, checked)}
                            disabled={updateControl.isPending}
                          />
                        </div>
                        {control.intensity != null && control.isActive && (
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
                              onValueChange={([v]) => handleIntensityChange(control.id, v)}
                              onValueCommit={([v]) => handleIntensityCommit(control.id, v)}
                            />
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
