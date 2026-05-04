import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Eye, Filter, X, ArrowRight, Download, FileText } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exporters";

const ENTITY_TYPES = ["all", "product", "purchase_order", "inventory_batch", "markdown_event", "approval_rule"];
const ACTIONS = ["all", "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "RECEIVE"];

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-success/10 text-success border-success/30",
  UPDATE: "bg-info/10 text-info border-info/30",
  DELETE: "bg-destructive/10 text-destructive border-destructive/30",
  APPROVE: "bg-primary/10 text-primary border-primary/30",
  REJECT: "bg-destructive/10 text-destructive border-destructive/30",
  RECEIVE: "bg-accent/10 text-accent border-accent/30",
};

const AuditLog = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (entity !== "all" && r.entity_type !== entity) return false;
      if (action !== "all" && r.action !== action) return false;
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
      if (search) {
        const blob = JSON.stringify(r).toLowerCase();
        if (!blob.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, entity, action, from, to, search]);

  const clearFilters = () => { setEntity("all"); setAction("all"); setFrom(""); setTo(""); setSearch(""); };
  const activeFilterCount = [entity !== "all", action !== "all", from, to, search].filter(Boolean).length;

  const summarize = (r: any) => r.new_value
    ? Object.entries(r.new_value).slice(0, 3).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`).join("; ")
    : (r.old_value ? "Deleted record" : "—");

  const exportCsv = () => {
    const rows = filtered.map(r => [
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
      r.entity_type, r.action, r.entity_id || "",
      JSON.stringify(r.old_value || {}), JSON.stringify(r.new_value || {}),
      r.user_id || "",
    ]);
    exportToCSV(`audit-log-${Date.now()}.csv`,
      ["Timestamp","Entity","Action","Entity ID","Before","After","User"], rows);
  };

  const exportPdf = () => {
    const rows = filtered.map(r => [
      format(new Date(r.created_at), "MMM d, HH:mm"),
      r.entity_type, r.action,
      r.entity_id ? r.entity_id.slice(0, 8) : "—",
      summarize(r).slice(0, 80),
    ]);
    const filterDesc = [
      entity !== "all" && `entity=${entity}`,
      action !== "all" && `action=${action}`,
      from && `from=${from}`,
      to && `to=${to}`,
      search && `search="${search}"`,
    ].filter(Boolean).join(", ") || "none";
    exportToPDF({
      title: "Audit Log Export",
      subtitle: "Filtered immutable history of system changes.",
      filename: `audit-log-${Date.now()}.pdf`,
      headers: ["Time","Entity","Action","ID","Summary"],
      rows,
      meta: { "Records": String(filtered.length), "Active filters": filterDesc },
    });
  };

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Immutable history of all critical data changes across the system."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}><Download className="h-4 w-4 mr-2" />CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={filtered.length === 0}><FileText className="h-4 w-4 mr-2" />PDF</Button>
          </>
        }
      />

      <Card className="page-section p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> of {rows.length}
          </div>
          {activeFilterCount > 0 && (
            <Button size="sm" variant="ghost" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear</Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Entity Type</Label>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITY_TYPES.map(e => <SelectItem key={e} value={e}>{e === "all" ? "All entities" : e.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTIONS.map(a => <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div><Label className="text-xs">Search</Label><Input placeholder="ID, value…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </Card>

      <DataTable
        rows={filtered}
        rowKey={(r: any) => r.id}
        exportFilename="audit-log"
        onRowClick={(r: any) => setSelected(r)}
        columns={[
          { key: "created_at", header: "Time", accessor: (r: any) => new Date(r.created_at), sortable: true, filter: "date", cell: (r: any) => <span className="text-xs whitespace-nowrap text-muted-foreground">{format(new Date(r.created_at), "MMM d, HH:mm:ss")}</span>, exportValue: (r: any) => format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss") },
          { key: "entity_type", header: "Entity", accessor: (r: any) => r.entity_type, filter: "select", sortable: true, cell: (r: any) => <Badge variant="outline" className="font-mono text-[10px]">{r.entity_type}</Badge> },
          { key: "action", header: "Action", accessor: (r: any) => r.action, filter: "select", sortable: true, cell: (r: any) => <span className={`pill ${ACTION_COLORS[r.action] || "bg-muted text-muted-foreground border-border"}`}>{r.action}</span> },
          { key: "entity_id", header: "Entity ID", accessor: (r: any) => r.entity_id ?? "", filter: "text", cell: (r: any) => <span className="font-mono text-[11px] text-muted-foreground">{r.entity_id ? r.entity_id.slice(0, 8) : "—"}</span> },
          { key: "summary", header: "Summary", accessor: (r: any) => summarize(r), cell: (r: any) => <span className="text-xs text-muted-foreground line-clamp-1">{summarize(r)}</span> },
          { key: "view", header: "", accessor: () => "", exportable: false, cell: () => <Eye className="h-4 w-4 text-muted-foreground" /> },
        ]}
        emptyMessage="No audit entries match the filters."
      />

      <DetailDrawer entry={selected} onClose={() => setSelected(null)} />
    </>
  );
};

const DetailDrawer = ({ entry, onClose }: { entry: any; onClose: () => void }) => {
  if (!entry) return null;
  const oldVal = entry.old_value || {};
  const newVal = entry.new_value || {};
  const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));

  return (
    <Sheet open={!!entry} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className={`pill ${ACTION_COLORS[entry.action] || "bg-muted"}`}>{entry.action}</span>
            <Badge variant="outline" className="font-mono">{entry.entity_type}</Badge>
          </SheetTitle>
          <SheetDescription>
            {format(new Date(entry.created_at), "PPPp")}
            {entry.entity_id && <> · ID: <span className="font-mono">{entry.entity_id}</span></>}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {allKeys.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No before/after values recorded.</Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_1fr] bg-muted/40 text-xs font-semibold border-b">
                <div className="p-3">Field</div>
                <div className="p-3 border-x text-destructive">Before</div>
                <div className="p-3 text-success">After</div>
              </div>
              {allKeys.map(k => {
                const o = oldVal[k];
                const n = newVal[k];
                const changed = JSON.stringify(o) !== JSON.stringify(n);
                return (
                  <div key={k} className={`grid grid-cols-[1fr_auto_1fr] border-b last:border-0 text-xs ${changed ? "bg-warning/5" : ""}`}>
                    <div className="p-3 font-mono font-medium">{k}</div>
                    <div className="p-3 border-x font-mono text-muted-foreground break-all">
                      {o === undefined ? <span className="italic text-muted-foreground/50">—</span> : typeof o === "object" ? JSON.stringify(o) : String(o)}
                    </div>
                    <div className="p-3 font-mono break-all">
                      {n === undefined ? <span className="italic text-muted-foreground/50">—</span> : (
                        <span className="inline-flex items-center gap-1">
                          {changed && o !== undefined && <ArrowRight className="h-3 w-3 text-success shrink-0" />}
                          <span className={changed ? "text-success font-medium" : "text-muted-foreground"}>
                            {typeof n === "object" ? JSON.stringify(n) : String(n)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw JSON</summary>
            <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto font-mono text-[11px]">{JSON.stringify(entry, null, 2)}</pre>
          </details>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AuditLog;
