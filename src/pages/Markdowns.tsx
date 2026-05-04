import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { format } from "date-fns";

const Markdowns = () => {
  const { user, hasRole } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [discount, setDiscount] = useState(20);
  const [reason, setReason] = useState("EXPIRY_PROXIMITY");
  const [expDate, setExpDate] = useState("");

  const load = () => {
    supabase.from("markdown_events").select("*, products(sku,name), inventory_batches(batch_number, quantity_available)").order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  };
  useEffect(() => {
    load();
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
  }, []);
  useEffect(() => {
    if (productId) supabase.from("inventory_batches").select("*").eq("product_id", productId).gt("quantity_available", 0).then(({ data }) => setBatches(data ?? []));
  }, [productId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const batch = batches.find(b => b.id === batchId);
    const original = Number(product.current_sales_price);
    const newPrice = +(original * (1 - discount / 100)).toFixed(2);
    const qty = batch ? Number(batch.quantity_available) : 0;
    const impact = +(qty * (original - newPrice)).toFixed(2);

    const { error } = await supabase.from("markdown_events").insert({
      product_id: productId, batch_id: batchId || null,
      discount_percent: discount, original_price: original, new_price: newPrice,
      reason_code: reason as any, source_system: "MANUAL",
      expiry_date: expDate || null, status: "ACTIVE",
      financial_impact: impact, approved_by: user?.id,
    });
    if (error) return toast.error(error.message);
    await supabase.from("products").update({ current_sales_price: newPrice }).eq("id", productId);
    if (batchId) await supabase.from("inventory_batches").update({ status: "MARKDOWN_ACTIVE" }).eq("id", batchId);
    await supabase.from("audit_log").insert({ entity_type: "markdown", entity_id: productId, action: "CREATE", old_value: { price: original }, new_value: { price: newPrice, discount }, user_id: user?.id });
    toast.success("Markdown created and price updated");
    setOpen(false); load();
  };

  const cancel = async (id: string) => {
    await supabase.from("markdown_events").update({ status: "CANCELLED" }).eq("id", id);
    toast.success("Markdown cancelled"); load();
  };

  return (
    <>
      <PageHeader title="Markdown Management" description="Apply discounts on slow-moving or near-expiry stock."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Markdown</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Create markdown</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Label>Product *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name} (${Number(p.current_sales_price).toFixed(2)})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {batches.length > 0 && (
                  <div className="col-span-2"><Label>Batch (optional)</Label>
                    <Select value={batchId} onValueChange={setBatchId}>
                      <SelectTrigger><SelectValue placeholder="All batches" /></SelectTrigger>
                      <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.batch_number} — qty {Number(b.quantity_available).toFixed(0)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div><Label>Discount %</Label><Input type="number" min={1} max={90} value={discount} onChange={e => setDiscount(Number(e.target.value))} /></div>
                <div><Label>Reason</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPIRY_PROXIMITY">Expiry proximity</SelectItem>
                      <SelectItem value="DEMAND_BELOW_THRESHOLD">Low demand</SelectItem>
                      <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Expires on</Label><Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} /></div>
                <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Apply markdown</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        rows={rows}
        rowKey={(r: any) => r.id}
        exportFilename="markdowns"
        createdAtKey="created_at"
        columns={[
          { key: "product", header: "Product", accessor: (r: any) => r.products?.name ?? "", filter: "text", sortable: true, cell: (r: any) => <div><div className="font-medium">{r.products?.name}</div><div className="text-xs font-mono text-muted-foreground">{r.products?.sku}</div></div> },
          { key: "batch", header: "Batch", accessor: (r: any) => r.inventory_batches?.batch_number ?? "", filter: "text", cell: (r: any) => <span className="font-mono text-xs">{r.inventory_batches?.batch_number ?? "—"}</span> },
          { key: "original", header: "Original", accessor: (r: any) => Number(r.original_price), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums">${Number(r.original_price).toFixed(2)}</span> },
          { key: "new", header: "New", accessor: (r: any) => Number(r.new_price), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums font-medium">${Number(r.new_price).toFixed(2)}</span> },
          { key: "discount", header: "Discount", accessor: (r: any) => Number(r.discount_percent), sortable: true, cell: (r: any) => <Badge variant="secondary">{r.discount_percent}%</Badge> },
          { key: "reason_code", header: "Reason", accessor: (r: any) => r.reason_code, filter: "select", cell: (r: any) => <span className="text-xs">{r.reason_code.replace(/_/g, " ")}</span> },
          { key: "impact", header: "Impact", accessor: (r: any) => Number(r.financial_impact), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums text-destructive">-${Number(r.financial_impact).toFixed(2)}</span> },
          { key: "status", header: "Status", accessor: (r: any) => r.status, filter: "select", sortable: true, cell: (r: any) => <Badge className={r.status === "ACTIVE" ? "bg-success text-success-foreground" : ""} variant={r.status === "ACTIVE" ? "default" : "outline"}>{r.status}</Badge> },
          { key: "effective_date", header: "Effective", accessor: (r: any) => r.effective_date, sortable: true, filter: "date", cell: (r: any) => <span className="text-xs text-muted-foreground">{format(new Date(r.effective_date), "PP")}</span>, exportValue: (r: any) => r.effective_date },
          { key: "actions", header: "", accessor: () => "", align: "right", exportable: false, cell: (r: any) => r.status === "ACTIVE" && hasRole("cfo") && <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}><X className="h-4 w-4" /></Button> },
        ]}
        emptyMessage="No markdowns yet."
      />
    </>
  );
};
export default Markdowns;
