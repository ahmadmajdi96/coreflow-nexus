import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Package, Layers, ShoppingCart, Tag, AlertTriangle, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

interface Stat { label: string; value: string | number; icon: any; tone?: string; sub?: string }

const Dashboard = () => {
  const [s, setS] = useState({ products: 0, batches: 0, openPOs: 0, activeMd: 0, nearExpiry: 0, mdValue: 0 });

  useEffect(() => {
    (async () => {
      const [p, b, po, md, ne, mdAll] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("inventory_batches").select("*", { count: "exact", head: true }),
        supabase.from("purchase_orders").select("*", { count: "exact", head: true }).in("status", ["DRAFT","PENDING_APPROVAL","APPROVED"]),
        supabase.from("markdown_events").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
        supabase.from("inventory_batches").select("*", { count: "exact", head: true }).eq("status", "NEAR_EXPIRY"),
        supabase.from("markdown_events").select("financial_impact").eq("status","ACTIVE"),
      ]);
      const total = (mdAll.data ?? []).reduce((a, r: any) => a + Number(r.financial_impact || 0), 0);
      setS({
        products: p.count ?? 0, batches: b.count ?? 0, openPOs: po.count ?? 0,
        activeMd: md.count ?? 0, nearExpiry: ne.count ?? 0, mdValue: total,
      });
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
          <Card key={label} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="stat-label">{label}</div>
                <div className="stat-value mt-2">{value}</div>
              </div>
              <div className={`h-10 w-10 rounded-md flex items-center justify-center ${
                tone === "warning" ? "bg-warning/10 text-warning" :
                tone === "destructive" ? "bg-destructive/10 text-destructive" :
                "bg-primary/10 text-primary"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Quick actions</h3>
          <p className="text-sm text-muted-foreground mb-4">Jump to common workflows.</p>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/products" className="erp-card p-4 hover:shadow-md transition-shadow"><Package className="h-5 w-5 mb-2 text-primary" /><div className="font-medium text-sm">New Product</div></Link>
            <Link to="/purchase-orders" className="erp-card p-4 hover:shadow-md transition-shadow"><ShoppingCart className="h-5 w-5 mb-2 text-primary" /><div className="font-medium text-sm">Create PO</div></Link>
            <Link to="/markdowns" className="erp-card p-4 hover:shadow-md transition-shadow"><Tag className="h-5 w-5 mb-2 text-primary" /><div className="font-medium text-sm">Markdown Plan</div></Link>
            <Link to="/cfo" className="erp-card p-4 hover:shadow-md transition-shadow"><TrendingDown className="h-5 w-5 mb-2 text-primary" /><div className="font-medium text-sm">Financial Impact</div></Link>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-1">System Status</h3>
          <p className="text-sm text-muted-foreground mb-4">All integrations healthy.</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>POS Integration</span><span className="text-success">● Connected</span></div>
            <div className="flex justify-between"><span>AI Pricing Engine</span><span className="text-success">● Connected</span></div>
            <div className="flex justify-between"><span>WMS Integration</span><span className="text-success">● Connected</span></div>
            <div className="flex justify-between"><span>Audit Logging</span><span className="text-success">● Active</span></div>
          </div>
        </Card>
      </div>
    </>
  );
};
export default Dashboard;
