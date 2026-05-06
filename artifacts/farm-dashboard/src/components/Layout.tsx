import { Link, useLocation } from "wouter";
import { LayoutDashboard, Layers, Bell, Lightbulb, Leaf, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListAlerts } from "@workspace/api-client-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/zones", label: "Farm Zones", icon: Layers },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/recommendations", label: "AI Insights", icon: Lightbulb },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: alerts } = useListAlerts({ status: "active" });
  const activeAlertCount = alerts?.length ?? 0;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sidebar-foreground text-sm leading-tight">VertiGrow</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Farm OS v1.0</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <div
                  data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                  )}
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
                  <span>{label}</span>
                  {label === "Alerts" && activeAlertCount > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {activeAlertCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="text-[10px] text-muted-foreground font-mono">UTMxHackathon &apos;26</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
