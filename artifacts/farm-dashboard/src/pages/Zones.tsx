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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Pencil, Layers, ChevronRight, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  BUILTIN_CROP_TYPES,
  aiDefaultProfile,
  saveCustomProfile,
  loadCustomProfiles,
  type PlantProfile,
} from "@/lib/plantProfiles";

type ZoneStatus = "active" | "idle" | "maintenance";

const statusColors: Record<ZoneStatus, string> = {
  active: "border-chart-2/50 text-chart-2 bg-chart-2/10",
  idle: "border-muted text-muted-foreground bg-muted/20",
  maintenance: "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
};

const CUSTOM_KEY = "__custom__";

type ProfileFields = {
  tempMin: string; tempMax: string;
  humidityMin: string; humidityMax: string;
  phMin: string; phMax: string;
  moistureMin: string; moistureMax: string;
  lightHours: string;
  description: string;
};

const blankProfileFields = (): ProfileFields => ({
  tempMin: "", tempMax: "", humidityMin: "", humidityMax: "",
  phMin: "", phMax: "", moistureMin: "", moistureMax: "",
  lightHours: "", description: "",
});

function toProfile(cropName: string, fields: ProfileFields): PlantProfile {
  const n = (v: string, fallback: number) => { const p = parseFloat(v); return isNaN(p) ? fallback : p; };
  return {
    name: cropName,
    cropKey: cropName,
    tempRange: [n(fields.tempMin, 18), n(fields.tempMax, 26)],
    humidityRange: [n(fields.humidityMin, 55), n(fields.humidityMax, 75)],
    phRange: [n(fields.phMin, 5.8), n(fields.phMax, 6.8)],
    soilMoistureRange: [n(fields.moistureMin, 55), n(fields.moistureMax, 75)],
    lightHoursPerDay: n(fields.lightHours, 14),
    description: fields.description || `Custom profile for ${cropName}.`,
    isCustom: true,
  };
}

export default function Zones() {
  const queryClient = useQueryClient();
  const { data: zones, isLoading } = useListZones();
  const createZone = useCreateZone();
  const deleteZone = useDeleteZone();
  const updateZone = useUpdateZone();

  const [showCreate, setShowCreate] = useState(false);
  const [editZone, setEditZone] = useState<{ id: number; name: string; cropType: string; rackCount: number; status: ZoneStatus } | null>(null);
  const [form, setForm] = useState({ name: "", cropType: "", rackCount: 4, status: "active" as ZoneStatus });
  const [cropSelection, setCropSelection] = useState<string>("");
  const [customCropName, setCustomCropName] = useState("");
  const [profileFields, setProfileFields] = useState<ProfileFields>(blankProfileFields());
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [useAiDefaults, setUseAiDefaults] = useState(true);

  const customProfiles = loadCustomProfiles();
  const allCustomCropKeys = Object.keys(customProfiles);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListZonesQueryKey() });

  const resolvedCropType = cropSelection === CUSTOM_KEY
    ? (customCropName.trim() || "Custom Crop")
    : cropSelection;

  const handleCreate = () => {
    const cropType = resolvedCropType;
    if (cropSelection === CUSTOM_KEY) {
      const profile = useAiDefaults
        ? aiDefaultProfile(cropType)
        : toProfile(cropType, profileFields);
      saveCustomProfile(profile);
    }
    createZone.mutate({ data: { ...form, cropType } }, {
      onSuccess: () => {
        setShowCreate(false);
        resetForm();
        invalidate();
      },
    });
  };

  const handleUpdate = () => {
    if (!editZone) return;
    const cropType = resolvedCropType;
    if (cropSelection === CUSTOM_KEY) {
      const profile = useAiDefaults
        ? aiDefaultProfile(cropType)
        : toProfile(cropType, profileFields);
      saveCustomProfile(profile);
    }
    updateZone.mutate({ id: editZone.id, data: { ...form, cropType } }, {
      onSuccess: () => { setEditZone(null); resetForm(); invalidate(); },
    });
  };

  const handleDelete = (id: number) => {
    deleteZone.mutate({ id }, { onSuccess: invalidate });
  };

  const resetForm = () => {
    setForm({ name: "", cropType: "", rackCount: 4, status: "active" });
    setCropSelection("");
    setCustomCropName("");
    setProfileFields(blankProfileFields());
    setShowProfileEditor(false);
    setUseAiDefaults(true);
  };

  const openEdit = (zone: typeof zones extends (infer T)[] | undefined ? T : never) => {
    setForm({ name: zone.name, cropType: zone.cropType, rackCount: zone.rackCount, status: zone.status as ZoneStatus });
    const isBuiltin = (BUILTIN_CROP_TYPES as readonly string[]).includes(zone.cropType);
    const isCustom = !isBuiltin;
    setCropSelection(isCustom ? CUSTOM_KEY : zone.cropType);
    setCustomCropName(isCustom ? zone.cropType : "");
    setProfileFields(blankProfileFields());
    setShowProfileEditor(false);
    setUseAiDefaults(true);
    setEditZone({ id: zone.id, name: zone.name, cropType: zone.cropType, rackCount: zone.rackCount, status: zone.status as ZoneStatus });
  };

  const pf = (field: keyof ProfileFields, v: string) =>
    setProfileFields(prev => ({ ...prev, [field]: v }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farm Zones</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and monitor your vertical farming zones</p>
        </div>
        <Button data-testid="button-create-zone" onClick={() => { resetForm(); setShowCreate(true); }}>
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
            <div key={zone.id} data-testid={`zone-card-${zone.id}`}
              className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-secondary/40 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{zone.name}</span>
                  <Badge variant="outline" className={cn("text-[10px] h-5", statusColors[zone.status as ZoneStatus])}>
                    {zone.status}
                  </Badge>
                  {allCustomCropKeys.includes(zone.cropType) && (
                    <Badge variant="outline" className="text-[10px] h-5 border-chart-4/50 text-chart-4">Custom</Badge>
                  )}
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
                <Button variant="ghost" size="sm" data-testid={`button-delete-zone-${zone.id}`}
                  onClick={() => handleDelete(zone.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editZone} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditZone(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editZone ? "Edit Zone" : "New Farm Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Zone Name</Label>
              <Input id="name" data-testid="input-zone-name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Zone A — Leafy Greens" />
            </div>

            {/* Crop type dropdown */}
            <div className="space-y-1.5">
              <Label>Crop Type</Label>
              <Select value={cropSelection} onValueChange={(v) => {
                setCropSelection(v);
                if (v !== CUSTOM_KEY) {
                  setForm(f => ({ ...f, cropType: v }));
                  setShowProfileEditor(false);
                } else {
                  setForm(f => ({ ...f, cropType: "" }));
                }
              }}>
                <SelectTrigger data-testid="select-zone-croptype">
                  <SelectValue placeholder="Select a crop type…" />
                </SelectTrigger>
                <SelectContent>
                  {BUILTIN_CROP_TYPES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  {allCustomCropKeys.filter(k => !(BUILTIN_CROP_TYPES as readonly string[]).includes(k)).map(k => (
                    <SelectItem key={k} value={k}>{k} (Custom)</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_KEY}>+ New custom crop…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom crop section */}
            {cropSelection === CUSTOM_KEY && (
              <div className="space-y-4 rounded-xl border border-chart-4/30 bg-chart-4/5 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="customCropName">Custom Crop Name</Label>
                  <Input
                    id="customCropName"
                    value={customCropName}
                    onChange={e => setCustomCropName(e.target.value)}
                    placeholder="e.g. Dragon Fruit, Watercress…"
                  />
                </div>

                {/* AI vs manual */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
                  <Sparkles className="w-4 h-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-chart-2 mb-0.5">AI-Generated Profile</div>
                    <div className="text-[10px] text-muted-foreground leading-snug">
                      Leave the ranges blank and the system will auto-fill balanced defaults optimised for most crops.
                    </div>
                  </div>
                  <Switch
                    checked={useAiDefaults}
                    onCheckedChange={v => { setUseAiDefaults(v); setShowProfileEditor(!v); }}
                    className="flex-shrink-0"
                  />
                </div>

                {/* Manual profile editor */}
                {!useAiDefaults && (
                  <Collapsible open={showProfileEditor} onOpenChange={setShowProfileEditor}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                        Set custom control ranges
                        <ChevronDown className={cn("w-3 h-3 transition-transform", showProfileEditor && "rotate-180")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Temp Min (°C)</Label>
                          <Input className="h-8 text-xs" value={profileFields.tempMin} onChange={e => pf("tempMin", e.target.value)} placeholder="18" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Temp Max (°C)</Label>
                          <Input className="h-8 text-xs" value={profileFields.tempMax} onChange={e => pf("tempMax", e.target.value)} placeholder="26" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Humidity Min (%)</Label>
                          <Input className="h-8 text-xs" value={profileFields.humidityMin} onChange={e => pf("humidityMin", e.target.value)} placeholder="55" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Humidity Max (%)</Label>
                          <Input className="h-8 text-xs" value={profileFields.humidityMax} onChange={e => pf("humidityMax", e.target.value)} placeholder="75" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">pH Min</Label>
                          <Input className="h-8 text-xs" value={profileFields.phMin} onChange={e => pf("phMin", e.target.value)} placeholder="5.8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">pH Max</Label>
                          <Input className="h-8 text-xs" value={profileFields.phMax} onChange={e => pf("phMax", e.target.value)} placeholder="6.8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Soil Moisture Min (%)</Label>
                          <Input className="h-8 text-xs" value={profileFields.moistureMin} onChange={e => pf("moistureMin", e.target.value)} placeholder="55" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Soil Moisture Max (%)</Label>
                          <Input className="h-8 text-xs" value={profileFields.moistureMax} onChange={e => pf("moistureMax", e.target.value)} placeholder="75" />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-[10px]">Light Hours / Day</Label>
                          <Input className="h-8 text-xs" value={profileFields.lightHours} onChange={e => pf("lightHours", e.target.value)} placeholder="14" />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-[10px]">Description</Label>
                          <Input className="h-8 text-xs" value={profileFields.description} onChange={e => pf("description", e.target.value)} placeholder="Brief notes about this crop…" />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rackCount">Rack Count</Label>
              <Input id="rackCount" data-testid="input-zone-racks" type="number" min={1}
                value={form.rackCount} onChange={e => setForm(f => ({ ...f, rackCount: parseInt(e.target.value) || 1 }))} />
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
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditZone(null); resetForm(); }}>Cancel</Button>
            <Button data-testid="button-save-zone"
              onClick={editZone ? handleUpdate : handleCreate}
              disabled={
                createZone.isPending || updateZone.isPending ||
                !cropSelection ||
                (cropSelection === CUSTOM_KEY && !customCropName.trim())
              }>
              {editZone ? "Save Changes" : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
