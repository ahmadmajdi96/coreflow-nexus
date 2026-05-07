import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, RefreshCw, ShieldCheck, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { parseFefoError } from "@/lib/fefoErrors";

type TriggerRow = { trigger_name: string; table_name: string; function_name: string; enabled: boolean };

const REQUIRED = [
  { name: "trg_enforce_sale_fefo", table: "public.sales_items", fn: "enforce_sale_fefo" },
  { name: "trg_apply_sale_return", table: "public.sales_return_items", fn: "apply_sale_return" },
];

const FefoHealth = () => {
  const [rows, setRows] = useState<TriggerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; title: string; detail: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("check_fefo_triggers");
    if (error) toast.error(error.message);
    setRows((data as TriggerRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const runFiringTest = async () => {
    setTesting(true); setTestResult(null);
    const { data, error } = await (supabase as any).rpc("test_fefo_firing");
    setTesting(false);
    if (error) {
      setTestResult({ ok: false, title: "Test failed to run", detail: error.message });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setTestResult({ ok: false, title: "No result", detail: "RPC returned no rows." });
      return;
    }
    if (row.fired) {
      const parsed = parseFefoError(row.message ?? "");
      setTestResult({
        ok: true,
        title: "Trigger fired correctly (test rolled back, no data written)",
        detail: parsed.detail || row.message,
      });
    } else {
      setTestResult({
        ok: false,
        title: "Trigger did NOT fire",
        detail: row.message || "Fake insert was not blocked — FEFO trigger may be missing or disabled.",
      });
    }
  };

  const found = (req: typeof REQUIRED[number]) => rows.find(r => r.trigger_name === req.name);

  return (
    <>
      <PageHeader
        title="FEFO Validation Health"
        description="Verify the database triggers that enforce sale-time FEFO and credit returns are installed and firing."
        badge={<Badge variant="outline"><ShieldCheck className="h-3 w-3 mr-1" />Diagnostic</Badge>}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button onClick={runFiringTest} disabled={testing}>
              <FlaskConical className={`h-4 w-4 mr-2 ${testing ? "animate-pulse" : ""}`} />
              {testing ? "Testing…" : "Run firing test"}
            </Button>
          </div>
        }
      />

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {REQUIRED.map((req) => {
          const f = found(req);
          const ok = !!f && f.enabled;
          return (
            <Card key={req.name} className={`p-5 ${ok ? "border-success/40" : "border-destructive/40 bg-destructive/5"}`}>
              <div className="flex items-start gap-3">
                {ok
                  ? <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                  : <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />}
                <div className="flex-1">
                  <div className="font-semibold">{req.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{req.table} → {req.fn}()</div>
                  <div className="mt-2 text-sm">
                    {!f && <span className="text-destructive">Missing — sales/returns will NOT be validated.</span>}
                    {f && !f.enabled && <span className="text-destructive">Disabled — re-enable to enforce FEFO.</span>}
                    {ok && <span className="text-success">Installed and enabled.</span>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {testResult && (
        <Alert variant={testResult.ok ? "default" : "destructive"} className="mb-4">
          {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{testResult.title}</AlertTitle>
          <AlertDescription>{testResult.detail}</AlertDescription>
        </Alert>
      )}

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">How this works</div>
        <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
          <li><b>Status check</b> reads <code>pg_trigger</code> via the <code>check_fefo_triggers()</code> function.</li>
          <li><b>Firing test</b> attempts an invalid <code>sales_items</code> insert. If the trigger is healthy it raises a friendly error which is shown above.</li>
          <li>Any blocking errors thrown elsewhere in the app (Sales, Returns) are translated using the same parser into field-level messages.</li>
        </ul>
      </Card>
    </>
  );
};

export default FefoHealth;
