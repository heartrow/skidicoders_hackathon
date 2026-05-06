import { useListRecommendations, useListZones } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Scissors, FlaskConical, Sun, Droplets, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const categoryConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  harvest_timing: { icon: Scissors, label: "Harvest Timing", color: "text-chart-1 bg-chart-1/15" },
  nutrient_adjustment: { icon: FlaskConical, label: "Nutrient Adjustment", color: "text-chart-4 bg-chart-4/15" },
  lighting_schedule: { icon: Sun, label: "Lighting Schedule", color: "text-yellow-400 bg-yellow-400/15" },
  watering_cycle: { icon: Droplets, label: "Watering Cycle", color: "text-chart-3 bg-chart-3/15" },
  environmental_control: { icon: Thermometer, label: "Environmental Control", color: "text-chart-2 bg-chart-2/15" },
};

const priorityColors = {
  high: "border-destructive/50 text-destructive",
  medium: "border-yellow-500/50 text-yellow-500",
  low: "border-muted text-muted-foreground",
};

export default function Recommendations() {
  const { data: recs, isLoading } = useListRecommendations();
  const { data: zones } = useListZones();

  const getZoneName = (zoneId: number | null | undefined) =>
    zoneId ? (zones?.find(z => z.id === zoneId)?.name ?? `Zone ${zoneId}`) : "All Zones";

  const grouped = recs?.reduce<Record<string, typeof recs>>((acc, r) => {
    const cat = r.category;
    acc[cat] = acc[cat] ?? [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Lightbulb className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Recommendations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Data-driven insights to maximise yield and minimise resource use</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : !recs?.length ? (
        <div className="text-center py-20 text-muted-foreground">No recommendations at this time.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped ?? {}).map(([category, items]) => {
            const cfg = categoryConfig[category] ?? { icon: Lightbulb, label: category, color: "text-primary bg-primary/15" };
            const Icon = cfg.icon;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", cfg.color)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-semibold">{cfg.label}</h2>
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </div>
                <div className="space-y-3">
                  {items.map(rec => (
                    <div key={rec.id} data-testid={`rec-card-${rec.id}`} className="bg-card border border-card-border rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-semibold text-sm leading-snug">{rec.title}</span>
                            <Badge variant="outline" className={cn("text-[10px] h-5 ml-auto flex-shrink-0", priorityColors[rec.priority as keyof typeof priorityColors])}>
                              {rec.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="outline" className="text-[10px] h-5 border-muted text-muted-foreground">
                              {getZoneName(rec.zoneId)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatDistanceToNow(new Date(rec.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
