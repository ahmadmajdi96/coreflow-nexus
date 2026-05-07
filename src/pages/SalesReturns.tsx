import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Undo2, Receipt, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { parseFefoError } from "@/lib/fefoErrors";
import { DataTable } from "@/components/DataTable";
import { useAuth } from "@/hooks/useAuth";

interface ReturnLine {
  sales_item_id: string;
  product_id: string;
  product_name: string;
  batch_id: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit_price: number;
  original_qty: number;
  already_returned: number;
  max_qty: number; // remaining returnable
  qty: number;
  expired: boolean;
}

const SalesReturns = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<ReturnLine[]>([]);

  const reload = async () => {
    const [{ data: r }, { data: tx }] = await Promise.all([
      supabase.from("sales_returns")
        .select("*, sales_return_items(*, products(name,sku), inventory_batches(batch_number)), sales_transactions(transaction_id, customer_name, invoice_number)")
        .order("occurred_at", { ascending: false }).limit(100),
      supabase.from("sales_transactions")
        .select("id, transaction_id, customer_name, invoice_number, occurred_at, total_amount, approval_status, posted_at, sales_items(id, product_id, batch_id, quantity, quantity_returned, unit_price, products(name,sku), inventory_batches(batch_number, expiry_date))")
        .in("approval_status", ["APPROVED", "NOT_REQUIRED"])
        .not("posted_at", "is", null)
        .order("occurred_at", { ascending: false }).limit(300),
    ]);
    setReturns(r ?? []);
    setTransactions(tx ?? []);
  };
  useEffect(() => { reload(); }, []);

  const selectedTx = useMemo(() => transactions.find(t => t.id === selectedTxId), [transactions, selectedTxId]);

  useEffect(() => {
    if (!selectedTx) { setLines([]); return; }
    const today = new Date();
    setLines((selectedTx.sales_items ?? []).map((it: any) => {
      const original = Number(it.quantity);
      const returned = Number(it.quantity_returned ?? 0);
      const remaining = Math.max(0, original - returned);
      const expiry = it.inventory_batches?.expiry_date ?? null;
      const expired = expiry ? new Date(expiry) < today : false;
      return {
        sales_item_id: it.id,
        product_id: it.product_id,
        product_name: `${it.products?.sku ?? ""} — ${it.products?.name ?? ""}`,
        batch_id: it.batch_id,
        batch_number: it.inventory_batches?.batch_number ?? null,
        expiry_date: expiry,
        unit_price: Number(it.unit_price),
        original_qty: original,
        already_returned: returned,
        max_qty: remaining,
        qty: 0,
        expired,
      } as ReturnLine;
    }));
  }, [selectedTxId]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.qty * l.unit_price, 0), [lines]);

  const submitReturn = async () => {
    if (!selectedTx) return toast.error("Select a sale");
    const items = lines.filter(l => l.qty > 0);
    if (!items.length) return toast.error("Enter at least one return quantity");
    const overReturn = items.find(l => l.qty > l.max_qty);
    if (overReturn) return toast.error(`Return qty exceeds remaining returnable for ${overReturn.product_name}`);
    const expiredLine = items.find(l => l.expired);
    if (expiredLine) return toast.error(`Cannot return to expired batch ${expiredLine.batch_number}`);
    const noBatch = items.find(l => !l.batch_id);
    if (noBatch) return toast.error(`Original sale line for ${noBatch.product_name} has no batch — cannot credit FEFO`);

    const code = `RET-${Date.now()}`;
    const { data: ret, error } = await supabase.from("sales_returns").insert({
      return_number: code, original_transaction_id: selectedTx.id,
      reason: reason || null, total_amount: total, created_by: user?.id,
    } as any).select().single();
    if (error || !ret) return toast.error(error?.message || "Failed to create return");

    const { error: itErr } = await supabase.from("sales_return_items").insert(
      items.map(l => ({
        return_id: ret.id, product_id: l.product_id, batch_id: l.batch_id,
        quantity: l.qty, unit_price: l.unit_price, original_sales_item_id: l.sales_item_id,
      }))
    );
    if (itErr) {
      await supabase.from("sales_returns").delete().eq("id", ret.id);
      return toast.error(`Return blocked: ${itErr.message}`);
    }

    await supabase.from("audit_log").insert({
      entity_type: "sales_return", entity_id: ret.id, action: "RETURN_POSTED",
      new_value: {
        return_number: code, original_tx: selectedTx.transaction_id, total,
        lines: items.map(l => ({
          product_id: l.product_id, batch_id: l.batch_id, batch_number: l.batch_number,
          qty: l.qty, unit_price: l.unit_price,
        })),
        reason,
      },
      user_id: user?.id,
    });

    toast.success(`Return ${code} posted · $${total.toFixed(2)} credited back to FEFO batches`);
    setOpen(false); setSelectedTxId(""); setReason(""); setLines([]); reload();
  };

  return (
    <>
      <PageHeader
        title="Sales Returns"
        description="Credit stock back to original FEFO batches and record refunds in the audit log."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Undo2 className="h-4 w-4 mr-2" />New Return</Button></DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Return</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Original Sale</Label>
                  <Select value={selectedTxId} onValueChange={setSelectedTxId}>
                    <SelectTrigger><SelectValue placeholder="Select original transaction…" /></SelectTrigger>
                    <SelectContent>
                      {transactions.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.transaction_id} · {t.customer_name || "—"} · ${Number(t.total_amount).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Damaged, wrong item, customer cancel…" />
                </div>

                {lines.length > 0 && (
                  <div className="space-y-2">
                    {lines.map((l, i) => {
                      const days = l.expiry_date ? differenceInDays(new Date(l.expiry_date), new Date()) : null;
                      const blocked = l.expired || l.max_qty <= 0;
                      return (
                        <Card key={l.sales_item_id} className={`p-3 ${blocked ? "border-destructive/40 bg-destructive/5" : ""}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{l.product_name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                                {l.batch_number
                                  ? <Badge variant="outline" className="font-mono">{l.batch_number}</Badge>
                                  : <Badge variant="outline" className="border-destructive/40 text-destructive">no batch</Badge>}
                                <span>Sold {l.original_qty} · returned {l.already_returned} · <b>remaining {l.max_qty}</b></span>
                                {l.expiry_date && (
                                  <span className={`flex items-center gap-1 ${l.expired ? "text-destructive" : days !== null && days <= 7 ? "text-warning" : ""}`}>
                                    <Clock className="h-3 w-3" />exp {l.expiry_date}{days !== null ? ` (${days}d)` : ""}
                                  </span>
                                )}
                                {l.expired && (
                                  <span className="flex items-center gap-1 text-destructive">
                                    <AlertTriangle className="h-3 w-3" />batch expired — cannot credit
                                  </span>
                                )}
                                {!l.expired && l.max_qty <= 0 && (
                                  <span className="flex items-center gap-1 text-destructive">
                                    <AlertTriangle className="h-3 w-3" />fully returned
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-28">
                              <Label className="text-xs">Return qty</Label>
                              <Input type="number" min={0} max={l.max_qty} value={l.qty} disabled={blocked}
                                onChange={e => setLines(arr => arr.map((x, j) => j === i ? { ...x, qty: Math.min(l.max_qty, Math.max(0, Number(e.target.value))) } : x))} />
                            </div>
                            <div className="w-24 text-right text-sm font-semibold tabular-nums">${(l.qty * l.unit_price).toFixed(2)}</div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-muted-foreground text-sm">Refund Total</span>
                  <span className="text-2xl font-bold tabular-nums">${total.toFixed(2)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submitReturn} disabled={!selectedTx || total <= 0}><Receipt className="h-4 w-4 mr-2" />Post Return</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        rows={returns}
        rowKey={(r: any) => r.id}
        exportFilename="sales_returns"
        createdAtKey="occurred_at"
        tableId="sales-returns"
        columns={[
          { key: "ret", header: "Return #", accessor: (r: any) => r.return_number, sortable: true, cell: (r: any) => <span className="font-mono text-xs font-medium">{r.return_number}</span> },
          { key: "tx", header: "Original Sale", accessor: (r: any) => r.sales_transactions?.transaction_id ?? "", cell: (r: any) => <span className="font-mono text-xs">{r.sales_transactions?.transaction_id || "—"}</span> },
          { key: "customer", header: "Customer", accessor: (r: any) => r.sales_transactions?.customer_name ?? "", cell: (r: any) => r.sales_transactions?.customer_name || "—" },
          { key: "when", header: "Occurred", accessor: (r: any) => r.occurred_at, sortable: true, cell: (r: any) => format(new Date(r.occurred_at), "PPp") },
          { key: "lines", header: "Lines", accessor: (r: any) => r.sales_return_items?.length ?? 0, align: "right" },
          { key: "reason", header: "Reason", accessor: (r: any) => r.reason ?? "", cell: (r: any) => <span className="text-xs">{r.reason || "—"}</span> },
          { key: "total", header: "Refund", accessor: (r: any) => Number(r.total_amount), sortable: true, align: "right", cell: (r: any) => <span className="tabular-nums font-semibold text-destructive">-${Number(r.total_amount).toFixed(2)}</span> },
        ]}
        emptyMessage="No returns recorded yet."
      />
    </>
  );
};

export default SalesReturns;
