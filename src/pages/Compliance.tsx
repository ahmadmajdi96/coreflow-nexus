import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileSearch } from "lucide-react";
import { format } from "date-fns";

const Compliance = () => {
  const [batchNumber, setBatchNumber] = useState("");
  const [trace, setTrace] = useState<any | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("inventory_batches").select("*, products(sku,name)").order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setRecent(data ?? []));
  }, []);

  const search = async () => {
    if (!batchNumber) return;
    const { data } = await supabase.from("inventory_batches")
      .select("*, products(sku,name,suppliers:primary_supplier_id(name))")
      .eq("batch_number", batchNumber).maybeSingle();
    if (!data) { setTrace({ notFound: true }); return; }
    const { data: sales } = await supabase.from("sales_items").select("*, sales_transactions(occurred_at, store_id)").eq("batch_id", data.id);
    setTrace({ batch: data, sales: sales ?? [] });
  };

  return (
    <>
      <PageHeader title="Compliance & Traceability" description="Full batch lifecycle from supplier to sale." />
      <Card className="p-6 mb-6">
        <Label>Batch Number Lookup</Label>
        <div className="flex gap-2 mt-2 max-w-xl">
          <Input value={batchNumber} onChange={e=>setBatchNumber(e.target.value)} placeholder="Enter batch number" />
          <Button onClick={search}><Search className="h-4 w-4 mr-2" />Trace</Button>
        </div>

        {trace?.notFound && <p className="text-sm text-destructive mt-4">Batch not found.</p>}
        {trace?.batch && (
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2"><FileSearch className="h-4 w-4" />Inbound</h4>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between"><dt className="text-muted-foreground">Product</dt><dd className="font-medium">{trace.batch.products?.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">SKU</dt><dd className="font-mono text-xs">{trace.batch.products?.sku}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Received</dt><dd>{format(new Date(trace.batch.received_date), "PP")}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Mfg date</dt><dd>{trace.batch.manufacturing_date ? format(new Date(trace.batch.manufacturing_date), "PP") : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Expiry</dt><dd>{trace.batch.expiry_date ? format(new Date(trace.batch.expiry_date), "PP") : "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Cost at receipt</dt><dd>${Number(trace.batch.unit_cost_at_receipt).toFixed(2)}</dd></div>
              </dl>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Outbound</h4>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between"><dt className="text-muted-foreground">Qty available</dt><dd>{Number(trace.batch.quantity_available).toFixed(0)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Sales transactions</dt><dd>{trace.sales.length}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><Badge>{trace.batch.status}</Badge></dd></div>
              </dl>
            </div>
          </div>
        )}
      </Card>

      <h3 className="font-semibold mb-3">Recent Batches</h3>
      <Card className="p-4">
        <div className="space-y-2">
          {recent.map(b => (
            <div key={b.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
              <div>
                <div className="font-mono text-xs">{b.batch_number}</div>
                <div className="text-xs text-muted-foreground">{b.products?.sku} — {b.products?.name}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setBatchNumber(b.batch_number); setTimeout(search, 0); }}>Trace</Button>
            </div>
          ))}
          {recent.length === 0 && <div className="text-center text-muted-foreground py-8 text-sm">No batches yet.</div>}
        </div>
      </Card>
    </>
  );
};
export default Compliance;
