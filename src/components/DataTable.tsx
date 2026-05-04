import { ReactNode, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Search, Filter, X, Download, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { exportToCSV } from "@/lib/exporters";
import { format } from "date-fns";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => any;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  /** "text" enables free-text contains-filter; "select" enables enum filter from data; "date" enables range; false hides filter */
  filter?: "text" | "select" | "date" | false;
  /** override options for select filter */
  options?: string[];
  className?: string;
  align?: "left" | "right" | "center";
  /** include in CSV export */
  exportable?: boolean;
  exportValue?: (row: T) => string | number;
}

interface Props<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  /** key of column or accessor returning created_at; auto-adds Created column when present */
  createdAtKey?: keyof T | ((r: T) => string | Date | null | undefined);
  /** filename prefix used when exporting CSV */
  exportFilename: string;
  rightToolbar?: ReactNode;
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
}

type SortDir = "asc" | "desc" | null;

const alignClass = (a?: "left" | "right" | "center") =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

export function DataTable<T>({
  rows, columns, createdAtKey, exportFilename, rightToolbar, emptyMessage = "No records.", rowKey, onRowClick, rowClassName,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState<Record<string, string>>({});
  const [dateTo, setDateTo] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const getCreated = (r: T): Date | null => {
    if (!createdAtKey) return null;
    const v = typeof createdAtKey === "function" ? createdAtKey(r) : (r as any)[createdAtKey];
    return v ? new Date(v) : null;
  };

  // Append Created column automatically if createdAtKey provided
  const allColumns = useMemo<DataTableColumn<T>[]>(() => {
    if (!createdAtKey) return columns;
    if (columns.some(c => c.key === "__created_at")) return columns;
    return [
      ...columns,
      {
        key: "__created_at",
        header: "Created",
        accessor: (r) => getCreated(r),
        cell: (r) => {
          const d = getCreated(r);
          return d ? <span className="text-xs text-muted-foreground whitespace-nowrap">{format(d, "MMM d, yyyy HH:mm")}</span> : <span className="text-muted-foreground">—</span>;
        },
        sortable: true,
        filter: "date",
        exportable: true,
        exportValue: (r) => { const d = getCreated(r); return d ? format(d, "yyyy-MM-dd HH:mm:ss") : ""; },
      },
    ];
  }, [columns, createdAtKey]);

  const optionsFor = (col: DataTableColumn<T>) => {
    if (col.options) return col.options;
    const set = new Set<string>();
    rows.forEach(r => {
      const v = col.accessor(r);
      if (v !== null && v !== undefined && v !== "") set.add(String(v));
    });
    return Array.from(set).sort();
  };

  const filtered = useMemo(() => {
    let out = rows;
    // global search
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(r => allColumns.some(c => {
        const v = c.accessor(r);
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(q);
      }));
    }
    // per-column filters
    out = out.filter(r => {
      for (const c of allColumns) {
        if (c.filter === "select") {
          const f = filters[c.key];
          if (f && f !== "__all__") {
            const v = c.accessor(r);
            if (String(v ?? "") !== f) return false;
          }
        } else if (c.filter === "text") {
          const f = filters[c.key];
          if (f) {
            const v = c.accessor(r);
            if (!String(v ?? "").toLowerCase().includes(f.toLowerCase())) return false;
          }
        } else if (c.filter === "date") {
          const v = c.accessor(r);
          const d = v ? new Date(v) : null;
          const from = dateFrom[c.key];
          const to = dateTo[c.key];
          if (from) { if (!d || d < new Date(from)) return false; }
          if (to)   { if (!d || d > new Date(to + "T23:59:59")) return false; }
        }
      }
      return true;
    });
    // sort
    if (sortKey && sortDir) {
      const col = allColumns.find(c => c.key === sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const av = col.accessor(a); const bv = col.accessor(b);
          if (av === bv) return 0;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = (av instanceof Date || typeof av === "number")
            ? (av as any) - (bv as any)
            : String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, allColumns, search, filters, dateFrom, dateTo, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    else setSortDir("asc");
  };

  const clearAll = () => { setFilters({}); setDateFrom({}); setDateTo({}); setSearch(""); };
  const activeFilters =
    Object.values(filters).filter(v => v && v !== "__all__").length +
    Object.values(dateFrom).filter(Boolean).length +
    Object.values(dateTo).filter(Boolean).length +
    (search ? 1 : 0);

  const exportCsv = () => {
    const cols = allColumns.filter(c => c.exportable !== false);
    const headers = cols.map(c => c.header);
    const csvRows = filtered.map(r => cols.map(c => {
      if (c.exportValue) return c.exportValue(r);
      const v = c.accessor(r);
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return format(v, "yyyy-MM-dd HH:mm:ss");
      if (typeof v === "object") return JSON.stringify(v);
      return v as string | number;
    }));
    exportToCSV(`${exportFilename}-${Date.now()}.csv`, headers, csvRows);
  };

  return (
    <div className="space-y-3">
      <Card className="page-section p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search any column…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5" />Filters
                {activeFilters > 0 && <Badge className="ml-1.5 h-5 px-1.5">{activeFilters}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] max-h-[70vh] overflow-y-auto" align="start">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold">Column filters</div>
                {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={clearAll}><X className="h-3 w-3 mr-1" />Reset</Button>}
              </div>
              <div className="space-y-3">
                {allColumns.filter(c => c.filter).map(c => (
                  <div key={c.key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">{c.header}</label>
                    {c.filter === "select" && (
                      <Select value={filters[c.key] ?? "__all__"} onValueChange={v => setFilters({ ...filters, [c.key]: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All</SelectItem>
                          {optionsFor(c).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {c.filter === "text" && (
                      <Input className="h-8" value={filters[c.key] ?? ""} onChange={e => setFilters({ ...filters, [c.key]: e.target.value })} placeholder={`Filter ${c.header.toLowerCase()}…`} />
                    )}
                    {c.filter === "date" && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" className="h-8" value={dateFrom[c.key] ?? ""} onChange={e => setDateFrom({ ...dateFrom, [c.key]: e.target.value })} />
                        <Input type="date" className="h-8" value={dateTo[c.key] ?? ""} onChange={e => setDateTo({ ...dateTo, [c.key]: e.target.value })} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearAll}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
            <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> of {rows.length}
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
          </Button>
          {rightToolbar}
        </div>
      </Card>

      <Card className="page-section">
        <div className="max-h-[calc(100vh-280px)] min-h-[300px] overflow-auto rounded-md">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow>
              {allColumns.map(c => (
                <TableHead key={c.key} className={`${alignClass(c.align)} bg-card ${c.className ?? ""}`}>
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      {c.header}
                      {sortKey === c.key
                        ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={allColumns.length} className="text-center text-muted-foreground py-12">{emptyMessage}</TableCell></TableRow>
            )}
            {filtered.map(r => (
              <TableRow
                key={rowKey(r)}
                className={`table-row-hover ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(r) : ""}`}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {allColumns.map(c => (
                  <TableCell key={c.key} className={`${alignClass(c.align)} ${c.className ?? ""}`}>
                    {c.cell ? c.cell(r) : (c.accessor(r) ?? <span className="text-muted-foreground">—</span>)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}
