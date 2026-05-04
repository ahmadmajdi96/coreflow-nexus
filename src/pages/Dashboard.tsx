import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Layers, ShoppingCart, Tag, AlertTriangle, TrendingDown, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Stat { label: string; value: string | number; icon: any; tone?: string }

const Dashboard = () => {
  const [s, setS] = useState({ products: 0, batches: 0, openPOs: 0, activeMd: 0, nearExpiry: 0, mdValue: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, b, po, md, ne, mdAll, audit] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("inventory_batches").select("*", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }).in("status", ["DRAFT","PENDING_APPROVAL","APPROVED"]),
        supabase.from("markdown_events").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("inventory_batches").select("*", { count: "exact", head: true }).eq("status", "NEAR_EXPIRY"),
        supabase.from("markdown_events").select("financial_impact").eq("status","ACTIVE"),
        supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(6),
      ]);
      const total = (mdAll.data ?? []).reduce((a, r: any) => a + Number(r.financial_impact || 0), 0);
      setS({
        products: p.count ?? 0, batches: b.count ?? 0, openPOs: po.count ?? 0,
        activeMd: md.count ?? 0, nearExpiry: ne.count ?? 0, mdValue: total,
      });
      setRecent(audit.data ?? []);
    })();
  }, []);

  const stats: Stat[] = [
    { label: "Active Products", value: s.products, icon: Package },
    { label: "Inventory Batches", value: s.batches, icon: Layers },
    { label: "Open Purchase Orders", value: s.openPOs, icon: ShoppingCart },
    { label: "Active Markdowns", value: s.activeMd, icon: Tag },
    { label: "Near-Expiry Batches", value: s.nearExpiry, icon: AlertTriangle, tone: "warning" },
    { label: "Markdown Exposure", value: `$${s.mdValue.toFixed(2)}`, icon: TrendingDown, tone: "destructive" },
  ];

  return (
    <>
      <PageHeader title="Operations Dashboard" description="Real-time view of your supply chain, inventory and pricing." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-label">{label}</div>
                <div className={`mt-2 text-3xl font-bold tabular-nums ${
                  tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : ""
                }`}>{value}</div>
              </div>
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${
                tone === "warning" ? "bg-warning/10 text-warning" :
                tone === "destructive" ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent activity</h3>
          <p className="text-sm text-muted-foreground mb-4">Audit-tracked changes across the system.</p>
          <div className="space-y-2">
            {recent.length === 0 && <div className="text-center text-muted-foreground text-sm py-8">No activity yet.</div>}
            {recent.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] uppercase">{r.entity_type}</Badge>
                  <span className="font-medium">{r.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Quick actions</h3>
          <p className="text-sm text-muted-foreground mb-4">Jump into common workflows.</p>
          <div className="space-y-2">
            <Link to="/products" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"><Package className="h-4 w-4 text-primary" /><span className="text-sm font-medium">New Product</span></Link>
            <Link to="/purchase-orders" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"><ShoppingCart className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Create Purchase Order</span></Link>
            <Link to="/markdowns" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"><Tag className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Apply Markdown</span></Link>
            <Link to="/cfo" className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"><BarChart3 className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Financial Impact</span></Link>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-3">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[["POS Integration"],["AI Pricing Engine"],["WMS Integration"],["Audit Logging"]].map(([n]) => (
            <div key={n} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
              <span className="text-muted-foreground">{n}</span>
              <span className="ml-auto text-success font-medium text-xs">Healthy</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};
export default Dashboard;
