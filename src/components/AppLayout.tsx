import { ReactNode } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Boxes, LayoutDashboard, Package, Layers, ShoppingCart, Tag, BarChart3,
  ShieldCheck, FileText, LogOut, Users, Calculator, FileBarChart2, Settings2,
  ArrowLeftRight, RefreshCw, MapPin, Zap, Trash2, Award, ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: any; adminOnly?: boolean };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/products", label: "Products", icon: Package },
      { to: "/batches", label: "Batches", icon: Layers },
      { to: "/movements", label: "Stock Movements", icon: ArrowLeftRight },
      { to: "/stock-by-location", label: "Stock by Location", icon: MapPin },
    ],
  },
  {
    label: "Procurement",
    items: [
      { to: "/suppliers", label: "Suppliers", icon: Users },
      { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { to: "/replenishment", label: "Replenishment", icon: RefreshCw },
      { to: "/supplier-performance", label: "Supplier Performance", icon: Award },
      { to: "/markdowns", label: "Markdowns", icon: Tag },
      { to: "/sales", label: "Sales / POS", icon: ShoppingBag },
    ],
  },
  {
    label: "Finance & Reports",
    items: [
      { to: "/cfo", label: "CFO Dashboard", icon: BarChart3 },
      { to: "/valuation", label: "Inventory Valuation", icon: Calculator },
      { to: "/sales-velocity", label: "Sales Velocity", icon: Zap },
      { to: "/waste", label: "Waste & Shrinkage", icon: Trash2 },
      { to: "/compliance", label: "Compliance", icon: ShieldCheck },
      { to: "/audit", label: "Audit Log", icon: FileText },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/approval-rules", label: "Approval Rules", icon: Settings2 },
      { to: "/users", label: "Users & Roles", icon: Users, adminOnly: true },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  system_admin: "Admin",
  inventory_manager: "Inventory",
  purchasing_manager: "Purchasing",
  cfo: "CFO",
  compliance_officer: "Compliance",
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut, roles, hasRole } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Brand */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md" style={{ background: "var(--gradient-primary)" }}>
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold tracking-tight text-sidebar-foreground">CoreERP</div>
            <div className="text-[10px] text-sidebar-muted uppercase tracking-wider font-medium">Enterprise · v1.0</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {sections.map((sec) => {
            const visible = sec.items.filter((n) => !n.adminOnly || hasRole("system_admin"));
            if (visible.length === 0) return null;
            return (
              <div key={sec.label}>
                <div className="nav-section-label">{sec.label}</div>
                <div className="space-y-0.5">
                  {visible.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/"}
                      className={({ isActive }) => cn("nav-link group", isActive && "nav-link-active")}
                    >
                      <Icon className="nav-icon h-4 w-4 shrink-0 text-sidebar-muted transition-colors group-hover:text-sidebar-accent-foreground" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-sidebar-border space-y-1.5">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/60 border border-sidebar-border/50">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-sm" style={{ background: "var(--gradient-primary)" }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-sidebar-foreground">{user.email}</div>
              <div className="text-[10px] text-sidebar-muted truncate">
                {roles.length ? roles.map((r) => ROLE_LABEL[r] || r).join(" · ") : "no roles"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 ml-64 overflow-y-auto h-screen" style={{ background: "var(--gradient-hero)" }}>
        <div className="px-8 py-6 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
