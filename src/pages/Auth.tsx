import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Boxes, ShieldCheck, Layers, BarChart3 } from "lucide-react";

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    nav("/");
  };
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center"><Boxes className="h-6 w-6" /></div>
          <div>
            <div className="text-xl font-bold">CoreERP</div>
            <div className="text-xs text-white/70">Enterprise Resource Planning</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Single source of truth for your products, inventory and pricing.</h2>
          <p className="text-white/80">From purchase order to invoice — manage batches, expiry, markdowns and financial impact in one place.</p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="space-y-2"><Layers className="h-5 w-5" /><div className="text-sm font-medium">Batch traceability</div></div>
            <div className="space-y-2"><BarChart3 className="h-5 w-5" /><div className="text-sm font-medium">Markdown impact</div></div>
            <div className="space-y-2"><ShieldCheck className="h-5 w-5" /><div className="text-sm font-medium">Role-based access</div></div>
          </div>
        </div>
        <div className="text-xs text-white/60">© 2026 CoreERP · Compliance-ready</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white" style={{ background: "var(--gradient-primary)" }}>
              <Boxes className="h-5 w-5" />
            </div>
            <div><h1 className="text-lg font-bold">CoreERP</h1></div>
          </div>
          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your CoreERP workspace.</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-4">
                <div><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating..." : "Create account"}</Button>
                <p className="text-xs text-muted-foreground">First user receives all roles (admin setup). Additional users default to Inventory Manager.</p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-5 border-t">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Mock seeded roles · click to fill</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Admin", email: "admin@coreerp.demo" },
                { label: "Inventory", email: "inventory@coreerp.demo" },
                { label: "Purchasing", email: "purchasing@coreerp.demo" },
                { label: "CFO", email: "cfo@coreerp.demo" },
                { label: "Compliance", email: "compliance@coreerp.demo" },
              ].map(r => (
                <button key={r.email} type="button" onClick={() => { setEmail(r.email); setPassword("demo1234"); }}
                  className="text-[11px] px-2 py-1.5 rounded-md border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-left">
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-muted-foreground block truncate text-[10px]">{r.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Password: <code className="font-mono">demo1234</code> · Sign up to create them.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
