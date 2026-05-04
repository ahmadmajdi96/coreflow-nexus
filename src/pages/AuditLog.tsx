import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const AuditLog = () => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <>
      <PageHeader title="Audit Log" description="Immutable history of all critical data changes." />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Entity</TableHead><TableHead>Action</TableHead><TableHead>Old</TableHead><TableHead>New</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No audit entries yet.</TableCell></TableRow>}
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.created_at), "PPp")}</TableCell>
                <TableCell><Badge variant="outline">{r.entity_type}</Badge></TableCell>
                <TableCell className="font-medium">{r.action}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">{r.old_value ? JSON.stringify(r.old_value) : "—"}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">{r.new_value ? JSON.stringify(r.new_value) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};
export default AuditLog;
