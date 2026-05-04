import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInDays, format } from "date-fns";

const statusBadge = (s: string) => {
  const map: Record<string,string> = {
    AVAILABLE: "bg-success text-success-foreground",
    NEAR_EXPIRY: "bg-warning text-warning-foreground",
    EXPIRED: "bg-destructive text-destructive-foreground",
    QUARANTINED: "bg-muted text-muted-foreground",
    MARKDOWN_ACTIVE: "bg-accent text-accent-foreground",
  };
  return <Badge className={map[s] ?? ""}>{s.replace("_"," ")}</Badge>;
};

const Batches = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("inventory_batches").select("*, products(sku,name,sell_by_days)").order("expiry_date", { ascending: true })
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <>
      <PageHeader title="Inventory Batches" description="Batch-level traceability with FIFO/FEFO valuation." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch #</TableHead><TableHead>Product</TableHead><TableHead>Received</TableHead>
              <TableHead>Expiry</TableHead><TableHead>Days Left</TableHead>
              <TableHead className="text-right">Qty Available</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No batches yet. Receive a PO to create batches.</TableCell></TableRow>}
            {rows.map(r => {
              const days = r.expiry_date ? differenceInDays(new Date(r.expiry_date), new Date()) : null;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.batch_number}</TableCell>
                  <TableCell><div className="font-medium">{r.products?.name}</div><div className="text-xs text-muted-foreground font-mono">{r.products?.sku}</div></TableCell>
                  <TableCell>{format(new Date(r.received_date), "PP")}</TableCell>
                  <TableCell>{r.expiry_date ? format(new Date(r.expiry_date), "PP") : "—"}</TableCell>
                  <TableCell>{days !== null ? <span className={days < 3 ? "text-destructive font-medium" : days < 7 ? "text-warning font-medium" : ""}>{days}d</span> : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.quantity_available).toFixed(0)}</TableCell>
                  <TableCell className="text-right tabular-nums">${Number(r.unit_cost_at_receipt).toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};
export default Batches;
