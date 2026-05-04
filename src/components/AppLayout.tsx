import { ReactNode } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Boxes, LayoutDashboard, Package, Layers, ShoppingCart, Tag, BarChart3,
  ShieldCheck, FileText, LogOut, Users
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
  { to: "/users", label: "Users & Roles", icon: Users },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut, roles } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">CoreERP</div>
            <div className="text-[11px] text-sidebar-muted">v1.0</div>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-2 py-1.5 text-xs text-sidebar-muted truncate">{user.email}</div>
          <div className="px-2 pb-2 text-[10px] text-sidebar-muted">
            {roles.length ? roles.map((r) => r.replace("_", " ")).join(" · ") : "no roles"}
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="px-8 py-6 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
