import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Line { product_id: string; quantity: number; unit_cost: number }

// Mock departmental budgets (NFR stub for budget check)
const DEPT_BUDGET = { allocated: 50000, spent_mtd: 32400 };
const APPROVAL_THRESHOLD = 5000;

const POs = () => {
  const { user, hasRole } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: 1, unit_cost: 0 }]);
  const [receiving, setReceiving] = useState<any | null>(null);

  const load = () => {
    supabase.from("purchase_orders").select("*, suppliers(name), purchase_order_lines(*, products(sku,name,expiry_trackable,shelf_life_days,sell_by_days))").order("created_at", { ascending: false })
      .then(({ data }) => setPos(data ?? []));
  };
  useEffect(() => {
    load();
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
    supabase.from("suppliers").select("*").then(({ data }) => setSuppliers(data ?? []));
  }, []);

  // Auto-populate unit cost from product when selected
  const setLineProduct = (i: number, productId: string) => {
    const p = products.find(p => p.id === productId);
    const c = [...lines];
    c[i].product_id = productId;
    if (p && !c[i].unit_cost) c[i].unit_cost = Number(p.unit_cost);
    setLines(c);
  };

  // Auto-fill supplier products: when supplier changes, suggest their products
  const supplierProducts = supplierId ? products.filter(p => p.primary_supplier_id === supplierId || !p.primary_supplier_id) : products;

  const total = lines.reduce((a, l) => a + Number(l.quantity) * Number(l.unit_cost), 0);
  const projectedSpent = DEPT_BUDGET.spent_mtd + total;
  const overBudget = projectedSpent > DEPT_BUDGET.allocated;
  const needsApproval = total >= APPROVAL_THRESHOLD;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lines.some(l => !l.product_id)) return toast.error("Fill all fields");
    if (overBudget) return toast.error("Order exceeds department budget");
    const po_number = `PO-${Date.now()}`;
    const status = needsApproval ? "PENDING_APPROVAL" : "APPROVED";
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      po_number, supplier_id: supplierId, total_amount: total, status,
      expected_date: expected || null, created_by: user?.id,
    }).select().single();
    if (error || !po) return toast.error(error?.message);
    const linesPayload = lines.map(l => ({ po_id: po.id, product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }));
    await supabase.from("purchase_order_lines").insert(linesPayload);
    await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "CREATE", new_value: { po_number, total, status }, user_id: user?.id });
    toast.success(`PO ${po_number} created · ${status.replace("_"," ")}`);
    setOpen(false); setLines([{ product_id: "", quantity: 1, unit_cost: 0 }]); setSupplierId(""); setExpected(""); load();
  };

  const approve = async (po: any) => {
    await supabase.from("purchase_orders").update({ status: "APPROVED", approved_by: user?.id }).eq("id", po.id);
    await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "APPROVE", user_id: user?.id });
    toast.success(`${po.po_number} approved`); load();
  };

  const receive = async (po: any, batches: Record<string, { batch_number: string; expiry_date: string; mfg_date: string }>) => {
    const today = new Date(); today.setHours(0,0,0,0);
    for (const line of po.purchase_order_lines) {
      const b = batches[line.id] || ({} as any);
      const isExp = line.products.expiry_trackable;
      if (!b.batch_number) {
        return toast.error(`Batch number required for ${line.products.sku}`);
      }
      if (isExp && !b.expiry_date) {
        return toast.error(`Expiry date required for expiry-tracked item ${line.products.sku}`);
      }
      if (isExp && new Date(b.expiry_date) <= today) {
        return toast.error(`Expiry date must be in the future for ${line.products.sku}`);
      }
      if (b.mfg_date && b.expiry_date && new Date(b.mfg_date) >= new Date(b.expiry_date)) {
        return toast.error(`Mfg date must be before expiry for ${line.products.sku}`);
      }
    }
    for (const line of po.purchase_order_lines) {
      const b = batches[line.id];
      await supabase.from("inventory_batches").insert({
        product_id: line.product_id,
        batch_number: b.batch_number,
        manufacturing_date: b.mfg_date || null,
        expiry_date: b.expiry_date || null,
        quantity_available: line.quantity,
        unit_cost_at_receipt: line.unit_cost,
        status: "AVAILABLE",
      });
      await supabase.from("audit_log").insert({ entity_type: "inventory_batch", action: "RECEIVE", new_value: { batch: b.batch_number, qty: line.quantity }, user_id: user?.id });
    }
    await supabase.from("purchase_orders").update({ status: "RECEIVED", received_date: new Date().toISOString().slice(0,10) }).eq("id", po.id);
    toast.success(`Goods received for ${po.po_number}`);
    setReceiving(null); load();
  };

  return (
    <>
      <PageHeader title="Purchase Orders" description="Create POs with budget checks and capture batch info on receipt."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New PO</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Supplier *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expected Date</Label><Input type="date" value={expected} onChange={e=>setExpected(e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Line items</Label>
                  {lines.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={l.product_id} onValueChange={v=>setLineProduct(i, v)}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Product (auto-fills cost)" /></SelectTrigger>
                        <SelectContent>{supplierProducts.map(p=><SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" placeholder="Qty" className="w-24" value={l.quantity} onChange={e=>{const c=[...lines];c[i].quantity=Number(e.target.value);setLines(c);}} />
                      <Input type="number" step="0.01" placeholder="Unit cost" className="w-28" value={l.unit_cost} onChange={e=>{const c=[...lines];c[i].unit_cost=Number(e.target.value);setLines(c);}} />
                      <Button type="button" variant="ghost" size="icon" onClick={()=>setLines(lines.filter((_,j)=>j!==i))} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={()=>setLines([...lines, { product_id: "", quantity: 1, unit_cost: 0 }])}><Plus className="h-4 w-4 mr-1" />Add line</Button>
                </div>

                {/* Budget Check */}
                <Card className={`p-4 border ${overBudget ? "border-destructive bg-destructive/5" : "border-success/30 bg-success/5"}`}>
                  <div className="flex items-start gap-3">
                    {overBudget ? <AlertCircle className="h-5 w-5 text-destructive shrink-0" /> : <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
                    <div className="flex-1 text-sm">
                      <div className="font-semibold mb-1">Department Budget Check</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><div className="text-muted-foreground">Allocated</div><div className="tabular-nums font-medium">${DEPT_BUDGET.allocated.toLocaleString()}</div></div>
                        <div><div className="text-muted-foreground">Spent MTD</div><div className="tabular-nums font-medium">${DEPT_BUDGET.spent_mtd.toLocaleString()}</div></div>
                        <div><div className="text-muted-foreground">After this PO</div><div className={`tabular-nums font-medium ${overBudget ? "text-destructive" : "text-success"}`}>${projectedSpent.toLocaleString()}</div></div>
                      </div>
                      {needsApproval && <div className="text-xs mt-2 text-warning">⚠ Order ≥ ${APPROVAL_THRESHOLD.toLocaleString()} requires approval before receiving.</div>}
                    </div>
                  </div>
                </Card>

                <div className="text-right text-sm">PO Total: <span className="text-lg font-bold tabular-nums">${total.toFixed(2)}</span></div>
                <DialogFooter><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" disabled={overBudget}>Submit PO</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card className="page-section">
        <Table>
          <TableHeader>
            <TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {pos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No purchase orders yet.</TableCell></TableRow>}
            {pos.map(po => (
              <TableRow key={po.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                <TableCell>{po.suppliers?.name}</TableCell>
                <TableCell>{po.expected_date ? format(new Date(po.expected_date), "PP") : "—"}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">${Number(po.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={
                    po.status === "RECEIVED" ? "bg-success text-success-foreground" :
                    po.status === "APPROVED" ? "bg-primary text-primary-foreground" :
                    po.status === "PENDING_APPROVAL" ? "bg-warning text-warning-foreground" : ""
                  } variant={po.status === "DRAFT" || po.status === "CANCELLED" ? "outline" : "default"}>{po.status.replace("_"," ")}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {po.status === "PENDING_APPROVAL" && hasRole("cfo") && <Button size="sm" variant="outline" onClick={()=>approve(po)}>Approve</Button>}
                  {po.status === "APPROVED" && (
                    <Button size="sm" variant="outline" onClick={()=>setReceiving(po)}><Package className="h-4 w-4 mr-1" />Receive</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <ReceiveDialog po={receiving} onClose={()=>setReceiving(null)} onReceive={receive} />
    </>
  );
};

const ReceiveDialog = ({ po, onClose, onReceive }: any) => {
  const [batches, setBatches] = useState<Record<string, any>>({});
  if (!po) return null;
  const today = new Date().toISOString().slice(0,10);
  return (
    <Dialog open={!!po} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive {po.po_number}</DialogTitle>
          <p className="text-sm text-muted-foreground">Capture batch number and expiry data per line. Expiry-trackable items enforce mandatory expiry capture and validate that the date is in the future.</p>
        </DialogHeader>
        <div className="space-y-3">
          {po.purchase_order_lines.map((l: any) => {
            const isExp = l.products.expiry_trackable;
            return (
              <Card key={l.id} className={`p-4 ${isExp ? "border-primary/30" : ""}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">{l.products.name} <span className="text-muted-foreground font-mono text-xs ml-2">{l.products.sku}</span></div>
                    <div className="text-sm text-muted-foreground">Qty: {l.quantity} @ ${Number(l.unit_cost).toFixed(2)}</div>
                  </div>
                  {isExp && <Badge className="bg-primary/10 text-primary border-primary/30">Expiry Tracked</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Batch # *</Label><Input onChange={e=>setBatches({...batches, [l.id]: {...batches[l.id], batch_number: e.target.value}})} placeholder="e.g. B20260501" /></div>
                  <div><Label className="text-xs">Mfg date</Label><Input type="date" max={today} onChange={e=>setBatches({...batches, [l.id]: {...batches[l.id], mfg_date: e.target.value}})} /></div>
                  <div><Label className="text-xs">Expiry {isExp && "*"}</Label><Input type="date" min={today} required={isExp} onChange={e=>setBatches({...batches, [l.id]: {...batches[l.id], expiry_date: e.target.value}})} /></div>
                </div>
              </Card>
            );
          })}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={()=>onReceive(po, batches)}>Confirm Receipt</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default POs;
