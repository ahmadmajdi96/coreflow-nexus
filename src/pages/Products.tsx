import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers as LayersIcon } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { DataTable } from "@/components/DataTable";

const blank = {
  id: "" as string | "",
  sku: "", name: "", category_id: "", primary_supplier_id: "",
  unit_cost: 0, default_sales_price: 0, current_sales_price: 0, tax_code_id: "",
  expiry_trackable: false, shelf_life_days: 14, sell_by_days: 2, active: true,
};

const Products = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [cats, setCats] = useState<any[]>([]);
  const [sups, setSups] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);

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

  const openNew = () => { setForm(blank); setBatches([]); setOpen(true); };
  const openEdit = async (r: any) => {
    setForm({ ...r, category_id: r.category_id ?? "", primary_supplier_id: r.primary_supplier_id ?? "", tax_code_id: r.tax_code_id ?? "" });
    const { data } = await supabase.from("inventory_batches").select("*").eq("product_id", r.id).order("expiry_date", { ascending: true });
    setBatches(data ?? []);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku: form.sku, name: form.name, active: form.active,
      category_id: form.category_id || null,
      primary_supplier_id: form.primary_supplier_id || null,
      tax_code_id: form.tax_code_id || null,
      unit_cost: Number(form.unit_cost),
      default_sales_price: Number(form.default_sales_price),
      current_sales_price: form.id ? Number(form.current_sales_price) : Number(form.default_sales_price),
      expiry_trackable: form.expiry_trackable,
      shelf_life_days: form.expiry_trackable ? Number(form.shelf_life_days) : null,
      sell_by_days: form.expiry_trackable ? Number(form.sell_by_days) : null,
    };
    if (form.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      await supabase.from("audit_log").insert({ entity_type: "product", entity_id: form.id, action: "UPDATE", new_value: payload });
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Product created");
    }
    setOpen(false); setForm(blank); load();
  };

  const del = async (r: any) => {
    const { error } = await supabase.from("products").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({ entity_type: "product", entity_id: r.id, action: "DELETE", old_value: { sku: r.sku } });
    toast.success("Product deleted"); setConfirmDel(null); load();
  };

  return (
    <>
      <PageHeader title="Product Master" description="Manage SKUs, pricing, expiry-tracking rules and inspect batches."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Product</Button>}
      />
      <DataTable
        rows={rows}
        rowKey={(r: any) => r.id}
        exportFilename="products"
        createdAtKey="created_at"
        columns={[
          { key: "sku", header: "SKU", accessor: (r: any) => r.sku, sortable: true, filter: "text", cell: (r: any) => <span className="font-mono text-xs">{r.sku}</span> },
          { key: "name", header: "Name", accessor: (r: any) => r.name, sortable: true, filter: "text", cell: (r: any) => <span className="font-medium">{r.name}</span> },
          { key: "category", header: "Category", accessor: (r: any) => r.categories?.name ?? "", filter: "select", cell: (r: any) => r.categories?.name ?? "—" },
          { key: "supplier", header: "Supplier", accessor: (r: any) => r.suppliers?.name ?? "", filter: "select", cell: (r: any) => r.suppliers?.name ?? "—" },
          { key: "unit_cost", header: "Cost", accessor: (r: any) => Number(r.unit_cost), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums">${Number(r.unit_cost).toFixed(2)}</span> },
          { key: "current_sales_price", header: "Price", accessor: (r: any) => Number(r.current_sales_price), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums font-medium">${Number(r.current_sales_price).toFixed(2)}</span> },
          { key: "expiry_trackable", header: "Expiry", accessor: (r: any) => r.expiry_trackable ? "Tracked" : "—", filter: "select", cell: (r: any) => r.expiry_trackable ? <Badge variant="secondary">Tracked</Badge> : <span className="text-muted-foreground text-xs">—</span> },
          { key: "active", header: "Status", accessor: (r: any) => r.active ? "Active" : "Inactive", filter: "select", cell: (r: any) => r.active ? <Badge className="bg-success text-success-foreground">Active</Badge> : <Badge variant="outline">Inactive</Badge> },
          { key: "actions", header: "", accessor: () => "", align: "right", exportable: false, cell: (r: any) => (
            <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
              <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ) },
        ]}
        emptyMessage="No products yet."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit product" : "Create product"}</DialogTitle></DialogHeader>
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
            {form.id && <div><Label>Current Sales Price</Label><Input type="number" step="0.01" value={form.current_sales_price} onChange={e=>setForm({...form,current_sales_price:e.target.value})} /></div>}
            <div><Label>Tax Code</Label>
              <Select value={form.tax_code_id} onValueChange={v=>setForm({...form,tax_code_id:v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{taxes.map(t=><SelectItem key={t.id} value={t.id}>{t.code} ({t.rate}%)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Checkbox id="exp" checked={form.expiry_trackable} onCheckedChange={(v)=>setForm({...form,expiry_trackable:!!v})} />
                <Label htmlFor="exp" className="cursor-pointer">Expiry trackable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="act" checked={form.active} onCheckedChange={(v)=>setForm({...form,active:!!v})} />
                <Label htmlFor="act" className="cursor-pointer">Active</Label>
              </div>
            </div>
            {form.expiry_trackable && (
              <>
                <div><Label>Shelf Life (days)</Label><Input type="number" value={form.shelf_life_days} onChange={e=>setForm({...form,shelf_life_days:e.target.value})} /></div>
                <div><Label>Sell-By (days before expiry)</Label><Input type="number" value={form.sell_by_days} onChange={e=>setForm({...form,sell_by_days:e.target.value})} /></div>
              </>
            )}

            {form.id && (
              <div className="col-span-2 mt-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><LayersIcon className="h-4 w-4 text-primary" />Batch Summary</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Batch #</TableHead><TableHead>Expiry</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Status</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {batches.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No batches received yet.</TableCell></TableRow>}
                      {batches.map(b => {
                        const days = b.expiry_date ? differenceInDays(new Date(b.expiry_date), new Date()) : null;
                        const near = days !== null && days <= (form.sell_by_days || 2);
                        return (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                            <TableCell>{b.expiry_date ? format(new Date(b.expiry_date), "PP") : "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{Number(b.quantity_available).toFixed(0)}</TableCell>
                            <TableCell>
                              {near
                                ? <Badge className="bg-warning text-warning-foreground">Near Expiry ⚠️</Badge>
                                : <Badge variant="secondary">{b.status.replace("_"," ")}</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter className="col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button type="submit">{form.id ? "Save changes" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o)=>!o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove <span className="font-mono">{confirmDel?.sku}</span> and any associated batches. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={()=>del(confirmDel)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default Products;
