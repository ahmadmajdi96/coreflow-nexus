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
      <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: "var(--gradient-primary)" }}>
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-sidebar-foreground">CoreERP</div>
            <div className="text-[11px] text-muted-foreground">v1.0 · Enterprise</div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => cn("nav-link", isActive && "nav-link-active")}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-secondary/50">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0" style={{ background: "var(--gradient-primary)" }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user.email}</div>
              <div className="text-[10px] text-muted-foreground truncate">{roles.length ? `${roles.length} role${roles.length > 1 ? "s" : ""}` : "no roles"}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start mt-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="px-8 py-6 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
