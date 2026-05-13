import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThumbsUp, ThumbsDown, Download } from "lucide-react";
import { format } from "date-fns";
import { exportToCSV } from "@/lib/exporters";

interface Row { id: string; user_id: string; rating: number; question: string | null; answer: string | null; created_at: string }

const RANGES: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

const CopilotAudit = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [range, setRange] = useState<keyof typeof RANGES>("7d");
  const [rating, setRating] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = new Date(); since.setDate(since.getDate() - RANGES[range]);
    let q = supabase.from("copilot_feedback").select("*").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(500);
    if (rating !== "all") q = q.eq("rating", Number(rating));
    const { data } = await q;
    const list = (data as any) ?? [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r: Row) => r.user_id))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,email,full_name").in("id", ids);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { m[p.id] = p.full_name || p.email || p.id; });
      setProfiles(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [range, rating]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const t = search.toLowerCase();
    return rows.filter((r) => (r.question || "").toLowerCase().includes(t) || (r.answer || "").toLowerCase().includes(t) || (profiles[r.user_id] || "").toLowerCase().includes(t));
  }, [rows, search, profiles]);

  const stats = useMemo(() => {
    const up = filtered.filter((r) => r.rating === 1).length;
    const down = filtered.filter((r) => r.rating === -1).length;
    const total = up + down;
    const byUser: Record<string, { up: number; down: number }> = {};
    filtered.forEach((r) => {
      const k = profiles[r.user_id] || r.user_id.slice(0, 8);
      byUser[k] = byUser[k] || { up: 0, down: 0 };
      if (r.rating === 1) byUser[k].up++; else byUser[k].down++;
    });
    return { up, down, total, satisfaction: total ? Math.round((up / total) * 100) : 0, byUser };
  }, [filtered, profiles]);

  const exportCsv = () => {
    exportToCSV(
      `copilot-feedback-${range}.csv`,
      ["Timestamp", "User", "Rating", "Question", "Answer"],
      filtered.map((r) => [
        r.created_at,
        profiles[r.user_id] || r.user_id,
        r.rating === 1 ? "thumbs_up" : "thumbs_down",
        r.question || "",
        r.answer || "",
      ]),
    );
  };

  return (
    <>
      <PageHeader title="Copilot Feedback Audit" description="Thumbs up/down feedback collected from the AI Copilot — useful for measuring quality and reviewing problematic answers." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total feedback</div><div className="text-2xl font-bold tabular-nums">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Thumbs up</div><div className="text-2xl font-bold text-success tabular-nums">{stats.up}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Thumbs down</div><div className="text-2xl font-bold text-destructive tabular-nums">{stats.down}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Satisfaction</div><div className="text-2xl font-bold tabular-nums">{stats.satisfaction}%</div></Card>
      </div>

      <Card className="p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Time range</label>
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Rating</label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">👍 Up</SelectItem>
              <SelectItem value="-1">👎 Down</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Search question, answer, or user</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV</Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-1">
          <h3 className="font-semibold mb-3 text-sm">By user</h3>
          {Object.keys(stats.byUser).length === 0 && <div className="text-xs text-muted-foreground">No feedback in this range.</div>}
          <div className="space-y-2">
            {Object.entries(stats.byUser).sort((a, b) => (b[1].up + b[1].down) - (a[1].up + a[1].down)).map(([user, c]) => (
              <div key={user} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <span className="truncate flex-1 mr-2">{user}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-success flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{c.up}</span>
                  <span className="text-destructive flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{c.down}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold mb-3 text-sm">Recent messages</h3>
          {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="text-xs text-muted-foreground">No feedback found.</div>}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filtered.map((r) => (
              <div key={r.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {r.rating === 1
                      ? <Badge variant="outline" className="text-success border-success/30"><ThumbsUp className="h-3 w-3 mr-1" /> Up</Badge>
                      : <Badge variant="outline" className="text-destructive border-destructive/30"><ThumbsDown className="h-3 w-3 mr-1" /> Down</Badge>}
                    <span className="text-xs text-muted-foreground">{profiles[r.user_id] || r.user_id.slice(0, 8)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
                </div>
                {r.question && <div className="text-xs"><span className="font-semibold text-muted-foreground">Q:</span> {r.question}</div>}
                {r.answer && <div className="text-xs mt-1 text-muted-foreground line-clamp-3"><span className="font-semibold">A:</span> {r.answer}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

export default CopilotAudit;
