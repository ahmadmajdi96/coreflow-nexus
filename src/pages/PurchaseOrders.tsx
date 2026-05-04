import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Package } from "lucide-react";
import { format } from "date-fns";

interface Line { product_id: string; quantity: number; unit_cost: number }

const POs = () => {
  const { user } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: 1, unit_cost: 0 }]);
  const [receiving, setReceiving] = useState<any | null>(null);

  const load = () => {
    supabase.from("purchase_orders").select("*, suppliers(name), purchase_order_lines(*, products(sku,name,expiry_trackable,shelf_life_days))").order("created_at", { ascending: false })
      .then(({ data }) => setPos(data ?? []));
  };
  useEffect(() => {
    load();
    supabase.from("products").select("*").eq("active", true).then(({ data }) => setProducts(data ?? []));
    supabase.from("suppliers").select("*").then(({ data }) => setSuppliers(data ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lines.some(l => !l.product_id)) return toast.error("Fill all fields");
    const total = lines.reduce((a, l) => a + Number(l.quantity) * Number(l.unit_cost), 0);
    const po_number = `PO-${Date.now()}`;
    const status = total > 5000 ? "PENDING_APPROVAL" : "APPROVED";
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      po_number, supplier_id: supplierId, total_amount: total, status,
      expected_date: expected || null, created_by: user?.id,
    }).select().single();
    if (error || !po) return toast.error(error?.message);
    const linesPayload = lines.map(l => ({ po_id: po.id, product_id: l.product_id, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }));
    await supabase.from("purchase_order_lines").insert(linesPayload);
    toast.success(`PO ${po_number} created (${status})`);
    setOpen(false); setLines([{ product_id: "", quantity: 1, unit_cost: 0 }]); setSupplierId(""); setExpected(""); load();
  };

  const receive = async (po: any, batches: Record<string, { batch_number: string; expiry_date: string; mfg_date: string }>) => {
    for (const line of po.purchase_order_lines) {
      const b = batches[line.id];
      if (!b?.batch_number || (line.products.expiry_trackable && !b?.expiry_date)) {
        return toast.error(`Batch info missing for ${line.products.sku}`);
      }
      await supabase.from("inventory_batches").insert({
        product_id: line.product_id,
        batch_number: b.batch_number,
        manufacturing_date: b.mfg_date || null,
        expiry_date: b.expiry_date || null,
        quantity_available: line.quantity,
        unit_cost_at_receipt: line.unit_cost,
        status: "AVAILABLE",
      });
    }
    await supabase.from("purchase_orders").update({ status: "RECEIVED", received_date: new Date().toISOString().slice(0,10) }).eq("id", po.id);
    await supabase.from("audit_log").insert({ entity_type: "purchase_order", entity_id: po.id, action: "RECEIVE", new_value: { status: "RECEIVED" }, user_id: user?.id });
    toast.success(`Goods received for ${po.po_number}`);
    setReceiving(null); load();
  };

  return (
    <>
      <PageHeader title="Purchase Orders" description="Create POs and capture batch info on receipt."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New PO</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Supplier *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expected Date</Label><Input type="date" value={expected} onChange={e=>setExpected(e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Lines</Label>
                  {lines.map((l, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={l.product_id} onValueChange={v=>{const c=[...lines];c[i].product_id=v;setLines(c);}}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>{products.map(p=><SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" placeholder="Qty" className="w-24" value={l.quantity} onChange={e=>{const c=[...lines];c[i].quantity=Number(e.target.value);setLines(c);}} />
                      <Input type="number" step="0.01" placeholder="Unit cost" className="w-28" value={l.unit_cost} onChange={e=>{const c=[...lines];c[i].unit_cost=Number(e.target.value);setLines(c);}} />
                      <Button type="button" variant="ghost" size="icon" onClick={()=>setLines(lines.filter((_,j)=>j!==i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={()=>setLines([...lines, { product_id: "", quantity: 1, unit_cost: 0 }])}><Plus className="h-4 w-4 mr-1" />Add line</Button>
                </div>
                <div className="text-right text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">${lines.reduce((a,l)=>a+Number(l.quantity)*Number(l.unit_cost),0).toFixed(2)}</span></div>
                <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit">Submit PO</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {pos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No purchase orders yet.</TableCell></TableRow>}
            {pos.map(po => (
              <TableRow key={po.id}>
                <TableCell className="font-mono text-xs">{po.po_number}</TableCell>
                <TableCell>{po.suppliers?.name}</TableCell>
                <TableCell>{po.expected_date ? format(new Date(po.expected_date), "PP") : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">${Number(po.total_amount).toFixed(2)}</TableCell>
                <TableCell><Badge variant={po.status === "RECEIVED" ? "default" : "secondary"}>{po.status.replace("_"," ")}</Badge></TableCell>
                <TableCell className="text-right">
                  {(po.status === "APPROVED" || po.status === "PENDING_APPROVAL") && (
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
  return (
    <Dialog open={!!po} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Receive {po.po_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {po.purchase_order_lines.map((l: any) => (
            <Card key={l.id} className="p-4">
              <div className="font-medium">{l.products.name} <span className="text-muted-foreground font-mono text-xs ml-2">{l.products.sku}</span></div>
              <div className="text-sm text-muted-foreground mb-3">Qty: {l.quantity} @ ${Number(l.unit_cost).toFixed(2)}</div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Batch # *</Label><Input onChange={e=>setBatches({...batches, [l.id]: {...batches[l.id], batch_number: e.target.value}})} /></div>
                <div><Label className="text-xs">Mfg date</Label><Input type="date" onChange={e=>setBatches({...batches, [l.id]: {...batches[l.id], mfg_date: e.target.value}})} /></div>
                <div><Label className="text-xs">Expiry {l.products.expiry_trackable && "*"}</Label><Input type="date" onChange={e=>setBatches({...batches, [l.id]: {...batches[l.id], expiry_date: e.target.value}})} /></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={()=>onReceive(po, batches)}>Confirm Receipt</Button></div>
      </DialogContent>
    </Dialog>
  );
};

export default POs;
