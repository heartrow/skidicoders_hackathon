import { useState } from "react";
import { useListZones, useCreateZone, useDeleteZone, useUpdateZone, getListZonesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Layers, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

type ZoneStatus = "active" | "idle" | "maintenance";

const statusColors: Record<ZoneStatus, string> = {
  active: "border-chart-2/50 text-chart-2 bg-chart-2/10",
  idle: "border-muted text-muted-foreground bg-muted/20",
  maintenance: "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
};

export default function Zones() {
  const queryClient = useQueryClient();
  const { data: zones, isLoading } = useListZones();
  const createZone = useCreateZone();
  const deleteZone = useDeleteZone();
  const updateZone = useUpdateZone();

  const [showCreate, setShowCreate] = useState(false);
  const [editZone, setEditZone] = useState<{ id: number; name: string; cropType: string; rackCount: number; status: ZoneStatus } | null>(null);
  const [form, setForm] = useState({ name: "", cropType: "", rackCount: 4, status: "active" as ZoneStatus });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListZonesQueryKey() });

  const handleCreate = () => {
    createZone.mutate({ data: form }, {
      onSuccess: () => { setShowCreate(false); setForm({ name: "", cropType: "", rackCount: 4, status: "active" }); invalidate(); }
    });
  };

  const handleUpdate = () => {
    if (!editZone) return;
    updateZone.mutate({ id: editZone.id, data: form }, {
      onSuccess: () => { setEditZone(null); invalidate(); }
    });
  };

  const handleDelete = (id: number) => {
    deleteZone.mutate({ id }, { onSuccess: invalidate });
  };

  const openEdit = (zone: typeof zones extends (infer T)[] | undefined ? T : never) => {
    setForm({ name: zone.name, cropType: zone.cropType, rackCount: zone.rackCount, status: zone.status as ZoneStatus });
    setEditZone({ id: zone.id, name: zone.name, cropType: zone.cropType, rackCount: zone.rackCount, status: zone.status as ZoneStatus });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farm Zones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and monitor your vertical farming zones</p>
        </div>
        <Button data-testid="button-create-zone" onClick={() => { setForm({ name: "", cropType: "", rackCount: 4, status: "active" }); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Zone
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : zones?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Layers className="w-10 h-10 text-muted-foreground mb-3 opacity-40" />
          <p className="text-muted-foreground">No zones yet. Create your first farm zone to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {zones?.map(zone => (
            <div key={zone.id} data-testid={`zone-card-${zone.id}`} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{zone.name}</span>
                  <Badge variant="outline" className={cn("text-[10px] h-5", statusColors[zone.status as ZoneStatus])}>
                    {zone.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{zone.cropType} · {zone.rackCount} racks</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/zones/${zone.id}`}>
                  <Button variant="ghost" size="sm" data-testid={`button-view-zone-${zone.id}`} className="text-xs h-8">
                    Details <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" data-testid={`button-edit-zone-${zone.id}`} onClick={() => openEdit(zone)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" data-testid={`button-delete-zone-${zone.id}`} onClick={() => handleDelete(zone.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editZone} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditZone(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editZone ? "Edit Zone" : "New Farm Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Zone Name</Label>
              <Input id="name" data-testid="input-zone-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Zone A — Leafy Greens" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cropType">Crop Type</Label>
              <Input id="cropType" data-testid="input-zone-croptype" value={form.cropType} onChange={e => setForm(f => ({ ...f, cropType: e.target.value }))} placeholder="Lettuce" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rackCount">Rack Count</Label>
              <Input id="rackCount" data-testid="input-zone-racks" type="number" min={1} value={form.rackCount} onChange={e => setForm(f => ({ ...f, rackCount: parseInt(e.target.value) || 1 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as ZoneStatus }))}>
                <SelectTrigger data-testid="select-zone-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditZone(null); }}>Cancel</Button>
            <Button data-testid="button-save-zone" onClick={editZone ? handleUpdate : handleCreate} disabled={createZone.isPending || updateZone.isPending}>
              {editZone ? "Save Changes" : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
