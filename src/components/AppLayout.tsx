import { ReactNode } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Boxes, LayoutDashboard, Package, Layers, ShoppingCart, Tag, BarChart3,
  ShieldCheck, FileText, LogOut, Users, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/batches", label: "Batches", icon: Layers },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { to: "/markdowns", label: "Markdowns", icon: Tag },
  { to: "/cfo", label: "CFO Dashboard", icon: BarChart3 },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/audit", label: "Audit Log", icon: FileText },
  { to: "/users", label: "Users & Roles", icon: Users, adminOnly: true },
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

  const visibleNav = nav.filter(n => !n.adminOnly || hasRole("system_admin"));

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg" style={{ background: "var(--gradient-primary)" }}>
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold tracking-tight text-white flex items-center gap-1.5">
              CoreERP
              <Sparkles className="h-3 w-3 text-primary-glow" />
            </div>
            <div className="text-[10px] text-sidebar-muted uppercase tracking-wider">v1.0 · Enterprise</div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/60">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-md" style={{ background: "var(--gradient-primary)" }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate text-white">{user.email}</div>
              <div className="text-[10px] text-sidebar-muted truncate">
                {roles.length ? roles.map(r => ROLE_LABEL[r] || r).join(" · ") : "no roles"}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-muted hover:text-white hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto" style={{ background: "var(--gradient-hero)" }}>
        <div className="px-8 py-6 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
