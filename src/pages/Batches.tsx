import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/DataTable";
import { differenceInDays, format } from "date-fns";

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    AVAILABLE: "bg-success text-success-foreground",
    NEAR_EXPIRY: "bg-warning text-warning-foreground",
    EXPIRED: "bg-destructive text-destructive-foreground",
    QUARANTINED: "bg-muted text-muted-foreground",
    MARKDOWN_ACTIVE: "bg-accent text-accent-foreground",
  };
  return <Badge className={map[s] ?? ""}>{s.replace("_", " ")}</Badge>;
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
      <DataTable
        rows={rows}
        rowKey={(r: any) => r.id}
        exportFilename="inventory-batches"
        createdAtKey="created_at"
        columns={[
          { key: "batch_number", header: "Batch #", accessor: (r: any) => r.batch_number, sortable: true, filter: "text", cell: (r: any) => <span className="font-mono text-xs">{r.batch_number}</span> },
          { key: "product", header: "Product", accessor: (r: any) => r.products?.name ?? "", filter: "text", cell: (r: any) => <div><div className="font-medium">{r.products?.name}</div><div className="text-xs text-muted-foreground font-mono">{r.products?.sku}</div></div> },
          { key: "received_date", header: "Received", accessor: (r: any) => r.received_date, sortable: true, filter: "date", cell: (r: any) => format(new Date(r.received_date), "PP"), exportValue: (r: any) => r.received_date },
          { key: "expiry_date", header: "Expiry", accessor: (r: any) => r.expiry_date, sortable: true, filter: "date", cell: (r: any) => r.expiry_date ? format(new Date(r.expiry_date), "PP") : "—", exportValue: (r: any) => r.expiry_date ?? "" },
          { key: "days_left", header: "Days Left", accessor: (r: any) => r.expiry_date ? differenceInDays(new Date(r.expiry_date), new Date()) : null, sortable: true, cell: (r: any) => {
            if (!r.expiry_date) return "—";
            const d = differenceInDays(new Date(r.expiry_date), new Date());
            return <span className={d < 3 ? "text-destructive font-medium" : d < 7 ? "text-warning font-medium" : ""}>{d}d</span>;
          }, exportValue: (r: any) => r.expiry_date ? differenceInDays(new Date(r.expiry_date), new Date()) : "" },
          { key: "qty", header: "Qty", accessor: (r: any) => Number(r.quantity_available), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums">{Number(r.quantity_available).toFixed(0)}</span> },
          { key: "unit_cost", header: "Unit Cost", accessor: (r: any) => Number(r.unit_cost_at_receipt), align: "right", sortable: true, cell: (r: any) => <span className="tabular-nums">${Number(r.unit_cost_at_receipt).toFixed(2)}</span> },
          { key: "status", header: "Status", accessor: (r: any) => r.status, filter: "select", sortable: true, cell: (r: any) => statusBadge(r.status) },
        ]}
        emptyMessage="No batches yet. Receive a PO to create batches."
      />
    </>
  );
};
export default Batches;
