import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/hooks/useAuth";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DataTable } from "@/components/DataTable";

const ROLES: AppRole[] = ["inventory_manager", "purchasing_manager", "cfo", "compliance_officer", "system_admin"];

const Users = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roleSel, setRoleSel] = useState<Record<string, AppRole>>({});

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles ?? []).map(p => ({ ...p, roles: (roles ?? []).filter(r => r.user_id === p.id).map(r => r.role) }));
    setUsers(merged);
  };
  useEffect(() => { load(); }, []);

  const addRole = async (uid: string) => {
    const role = roleSel[uid]; if (!role) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
    if (error) return toast.error(error.message);
    toast.success("Role assigned"); load();
  };

  const isAdmin = hasRole("system_admin");

  return (
    <>
      <PageHeader title="Users & Roles" description="Manage who can do what across CoreERP." />
      {!isAdmin && <Card className="p-4 mb-4 border-warning"><p className="text-sm">Only System Administrators can change roles.</p></Card>}
      <DataTable
        rows={users}
        rowKey={(u: any) => u.id}
        exportFilename="users"
        createdAtKey="created_at"
        columns={[
          { key: "full_name", header: "Name", accessor: (u: any) => u.full_name ?? "", sortable: true, filter: "text", cell: (u: any) => <div className="font-medium">{u.full_name}</div> },
          { key: "email", header: "Email", accessor: (u: any) => u.email ?? "", sortable: true, filter: "text", cell: (u: any) => <span className="text-muted-foreground text-sm">{u.email}</span> },
          { key: "roles", header: "Roles", accessor: (u: any) => u.roles.join(", "), filter: "text", cell: (u: any) => (
            <div className="flex flex-wrap gap-1">{u.roles.map((r: string) => <Badge key={r} variant="secondary" className="text-xs">{r.replace("_", " ")}</Badge>)}</div>
          ) },
          ...(isAdmin ? [{
            key: "assign", header: "Assign", accessor: () => "", exportable: false, cell: (u: any) => (
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <Select value={roleSel[u.id] ?? ""} onValueChange={(v: AppRole) => setRoleSel({ ...roleSel, [u.id]: v })}>
                  <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Add role" /></SelectTrigger>
                  <SelectContent>{ROLES.filter(r => !u.roles.includes(r)).map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" onClick={() => addRole(u.id)}>Add</Button>
              </div>
            ),
          }] : []),
        ]}
        emptyMessage="No users."
      />
    </>
  );
};
export default Users;
