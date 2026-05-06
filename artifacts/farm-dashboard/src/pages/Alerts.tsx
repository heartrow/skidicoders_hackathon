import { useState } from "react";
import { useListAlerts, useAcknowledgeAlert, getListAlertsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Bell, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type AlertStatus = "active" | "acknowledged" | "resolved";

const severityConfig = {
  critical: { color: "border-destructive/30 bg-destructive/10", badge: "border-destructive/50 text-destructive", icon: <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" /> },
  warning: { color: "border-yellow-500/30 bg-yellow-500/10", badge: "border-yellow-500/50 text-yellow-500", icon: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" /> },
  info: { color: "border-chart-3/30 bg-chart-3/10", badge: "border-chart-3/50 text-chart-3", icon: <Info className="w-4 h-4 text-chart-3 flex-shrink-0 mt-0.5" /> },
};

function AlertList({ status }: { status?: AlertStatus }) {
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useListAlerts(status ? { status } : {});
  const acknowledge = useAcknowledgeAlert();

  const handleAck = (id: number) => {
    acknowledge.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey({ status: "active" }) });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey({ status: "acknowledged" }) });
      }
    });
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (!alerts?.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle className="w-8 h-8 text-chart-2 mb-3 opacity-60" />
      <p className="text-muted-foreground text-sm">No {status ?? ""} alerts</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const cfg = severityConfig[alert.severity as keyof typeof severityConfig];
        return (
          <div key={alert.id} data-testid={`alert-${alert.id}`} className={cn("flex items-start gap-3 p-4 rounded-xl border", cfg.color)}>
            {cfg.icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className={cn("text-[10px] h-5", cfg.badge)}>{alert.severity}</Badge>
                <Badge variant="outline" className="text-[10px] h-5 border-muted text-muted-foreground">{alert.type.replace(/_/g, " ")}</Badge>
                <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                  {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm leading-snug">{alert.message}</p>
            </div>
            {alert.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                data-testid={`button-ack-${alert.id}`}
                className="flex-shrink-0 h-7 text-xs"
                onClick={() => handleAck(alert.id)}
                disabled={acknowledge.isPending}
              >
                Acknowledge
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Alerts() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Predictive anomaly detection and system notifications</p>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-muted/30">
          <TabsTrigger value="active" data-testid="tab-active-alerts">Active</TabsTrigger>
          <TabsTrigger value="acknowledged" data-testid="tab-acknowledged-alerts">Acknowledged</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all-alerts">All</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4"><AlertList status="active" /></TabsContent>
        <TabsContent value="acknowledged" className="mt-4"><AlertList status="acknowledged" /></TabsContent>
        <TabsContent value="all" className="mt-4"><AlertList /></TabsContent>
      </Tabs>
    </div>
  );
}
