import { useListSensors, useListZones } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer, Droplets, FlaskConical, Sprout, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", inRange ? "bg-chart-2/20 text-chart-2" : "bg-destructive/20 text-destructive")}>
          {inRange ? "Optimal" : "Out of range"}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", inRange ? "bg-chart-2" : "bg-destructive")} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span><span>Optimal: {optimal[0]}–{optimal[1]}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function Sensors() {
  const { data: sensors, isLoading } = useListSensors();
  const { data: zones } = useListZones();

  const getZoneName = (zoneId: number) => zones?.find(z => z.id === zoneId)?.name ?? `Zone ${zoneId}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Sensor Monitor</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Live readings from all farm zones</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : sensors?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No sensor readings available.</div>
      ) : (
        <div className="grid gap-4">
          {sensors?.map(s => (
            <div key={s.id} data-testid={`sensor-zone-${s.zoneId}`} className="bg-card border border-card-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-sm">{getZoneName(s.zoneId)}</h2>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(s.recordedAt), { addSuffix: true })}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Thermometer className="w-3.5 h-3.5 text-chart-1" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Temperature</span>
                  </div>
                  <SensorGauge value={s.temperature} min={15} max={40} optimal={[20, 28]} unit="°C" color="text-chart-1" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="w-3.5 h-3.5 text-chart-3" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Humidity</span>
                  </div>
                  <SensorGauge value={s.humidity} min={30} max={100} optimal={[55, 80]} unit="%" color="text-chart-3" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sprout className="w-3.5 h-3.5 text-chart-2" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Soil Moisture</span>
                  </div>
                  <SensorGauge value={s.soilMoisture} min={0} max={100} optimal={[50, 80]} unit="%" color="text-chart-2" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical className="w-3.5 h-3.5 text-chart-4" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">pH Level</span>
                  </div>
                  <SensorGauge value={s.phLevel} min={4} max={9} optimal={[5.8, 6.8]} unit=" pH" color="text-chart-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
