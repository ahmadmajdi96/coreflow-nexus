import { ReactNode, createContext, useContext } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  allowed: AppRole[];
  readOnlyFor?: AppRole[];
  children: ReactNode;
}

const ReadOnlyCtx = createContext(false);
export const useReadOnly = () => useContext(ReadOnlyCtx);

const RoleGuard = ({ allowed, readOnlyFor = [], children }: Props) => {
  const { roles, loading, hasRole } = useAuth();
  if (loading) return null;

  // System admin can access anything
  const allowedWithAdmin = [...allowed, "system_admin" as AppRole];
  const canAccess = allowedWithAdmin.some((r) => hasRole(r));

  if (!canAccess) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <Card className="p-8 text-center border-destructive/30">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-3" />
          <h2 className="text-xl font-semibold mb-1">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mb-3">You don't have permission to view this section.</p>
          <p className="text-xs text-muted-foreground">
            Required role: <span className="font-mono">{allowed.join(" / ")}</span>
            <br />Your roles: <span className="font-mono">{roles.join(", ") || "none"}</span>
          </p>
        </Card>
      </div>
    );
  }

  const isReadOnly = readOnlyFor.some((r) => hasRole(r)) && !hasRole("system_admin");
  return <ReadOnlyCtx.Provider value={isReadOnly}>{children}</ReadOnlyCtx.Provider>;
};

export default RoleGuard;
