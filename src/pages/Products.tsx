import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

const blank = {
  sku: "", name: "", category_id: "", primary_supplier_id: "",
  unit_cost: 0, default_sales_price: 0, tax_code_id: "",
  expiry_trackable: false, shelf_life_days: 14, sell_by_days: 2,
};

const Products = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [cats, setCats] = useState<any[]>([]);
  const [sups, setSups] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("products")
      .select("*, categories(name), suppliers(name)").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
    supabase.from("categories").select("*").then(({ data }) => setCats(data ?? []));
    supabase.from("suppliers").select("*").then(({ data }) => setSups(data ?? []));
    supabase.from("tax_codes").select("*").then(({ data }) => setTaxes(data ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      current_sales_price: form.default_sales_price,
      unit_cost: Number(form.unit_cost), default_sales_price: Number(form.default_sales_price),
      shelf_life_days: form.expiry_trackable ? Number(form.shelf_life_days) : null,
      sell_by_days: form.expiry_trackable ? Number(form.sell_by_days) : null,
      category_id: form.category_id || null,
      primary_supplier_id: form.primary_supplier_id || null,
      tax_code_id: form.tax_code_id || null,
    };
    const { error } = await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Product created");
    setOpen(false); setForm(blank); load();
  };

  const filtered = rows.filter(r =>
    !q || r.sku.toLowerCase().includes(q.toLowerCase()) || r.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Product Master" description="Manage SKUs, pricing, and expiry-tracking rules."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Product</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create product</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                <div><Label>SKU *</Label><Input required maxLength={20} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} /></div>
                <div><Label>Name *</Label><Input required maxLength={100} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v=>setForm({...form,category_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{cats.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Primary Supplier</Label>
                  <Select value={form.primary_supplier_id} onValueChange={v=>setForm({...form,primary_supplier_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{sups.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Unit Cost</Label><Input type="number" step="0.01" value={form.unit_cost} onChange={e=>setForm({...form,unit_cost:e.target.value})} /></div>
                <div><Label>Default Sales Price</Label><Input type="number" step="0.01" value={form.default_sales_price} onChange={e=>setForm({...form,default_sales_price:e.target.value})} /></div>
                <div><Label>Tax Code</Label>
                  <Select value={form.tax_code_id} onValueChange={v=>setForm({...form,tax_code_id:v})}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{taxes.map(t=><SelectItem key={t.id} value={t.id}>{t.code} ({t.rate}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center gap-2 pt-2">
                  <Checkbox id="exp" checked={form.expiry_trackable} onCheckedChange={(v)=>setForm({...form,expiry_trackable:!!v})} />
                  <Label htmlFor="exp" className="cursor-pointer">Expiry trackable (enables batch/lot enforcement)</Label>
                </div>
                {form.expiry_trackable && (
                  <>
                    <div><Label>Shelf Life (days)</Label><Input type="number" value={form.shelf_life_days} onChange={e=>setForm({...form,shelf_life_days:e.target.value})} /></div>
                    <div><Label>Sell-By (days before expiry)</Label><Input type="number" value={form.sell_by_days} onChange={e=>setForm({...form,sell_by_days:e.target.value})} /></div>
                  </>
                )}
                <div className="col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search SKU or name…" className="pl-9" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead><TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Price</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No products yet.</TableCell></TableRow>}
            {filtered.map(r=>(
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.categories?.name ?? "—"}</TableCell>
                <TableCell>{r.suppliers?.name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">${Number(r.unit_cost).toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">${Number(r.current_sales_price).toFixed(2)}</TableCell>
                <TableCell>{r.expiry_trackable ? <Badge variant="secondary">Tracked</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                <TableCell>{r.active ? <Badge className="bg-success text-success-foreground">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};
export default Products;
