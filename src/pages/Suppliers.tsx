import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/DataTable";

const blank = { id: "", name: "", contact_email: "", contact_phone: "" };

const Suppliers = () => {
  const { user, hasRole } = useAuth();
  const canEdit = hasRole("system_admin") || hasRole("purchasing_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank);
  const [confirmDel, setConfirmDel] = useState<any | null>(null);

  const load = () => supabase.from("suppliers").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, contact_email: form.contact_email || null, contact_phone: form.contact_phone || null };
    if (form.id) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      await supabase.from("audit_log").insert({ entity_type: "supplier", entity_id: form.id, action: "UPDATE", new_value: payload, user_id: user?.id });
      toast.success("Supplier updated");
    } else {
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) return toast.error(error.message);
      await supabase.from("audit_log").insert({ entity_type: "supplier", action: "CREATE", new_value: payload, user_id: user?.id });
      toast.success("Supplier created");
    }
    setOpen(false); setForm(blank); load();
  };

  const del = async (r: any) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_log").insert({ entity_type: "supplier", entity_id: r.id, action: "DELETE", old_value: { name: r.name }, user_id: user?.id });
    toast.success("Supplier deleted"); setConfirmDel(null); load();
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Manage trading partners used by Purchase Orders."
        actions={canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(blank); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Supplier</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} supplier</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div><Label>Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">{form.id ? "Save" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <DataTable
        rows={rows}
        rowKey={(r: any) => r.id}
        exportFilename="suppliers"
        createdAtKey="created_at"
        columns={[
          { key: "name", header: "Name", accessor: (r: any) => r.name, sortable: true, filter: "text", cell: (r: any) => <span className="font-medium">{r.name}</span> },
          { key: "contact_email", header: "Email", accessor: (r: any) => r.contact_email ?? "", filter: "text", cell: (r: any) => r.contact_email ?? <span className="text-muted-foreground">—</span> },
          { key: "contact_phone", header: "Phone", accessor: (r: any) => r.contact_phone ?? "", filter: "text", cell: (r: any) => r.contact_phone ?? <span className="text-muted-foreground">—</span> },
          ...(canEdit ? [{
            key: "actions", header: "", accessor: () => "", align: "right" as const, exportable: false,
            cell: (r: any) => (
              <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                <Button size="icon" variant="ghost" onClick={() => { setForm({ ...r, contact_email: r.contact_email ?? "", contact_phone: r.contact_phone ?? "" }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ),
          }] : []),
        ]}
        emptyMessage="No suppliers yet."
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete supplier?</AlertDialogTitle>
            <AlertDialogDescription>Removes <strong>{confirmDel?.name}</strong>. Existing POs/products keep historical reference.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => del(confirmDel)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default Suppliers;
