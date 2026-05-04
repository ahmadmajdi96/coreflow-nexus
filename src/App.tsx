import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Batches from "./pages/Batches";
import PurchaseOrders from "./pages/PurchaseOrders";
import Markdowns from "./pages/Markdowns";
import CFODashboard from "./pages/CFODashboard";
import Compliance from "./pages/Compliance";
import AuditLog from "./pages/AuditLog";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Wrap = ({ children }: { children: React.ReactNode }) => <AppLayout>{children}</AppLayout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Wrap><Dashboard /></Wrap>} />
            <Route path="/products" element={<Wrap><Products /></Wrap>} />
            <Route path="/batches" element={<Wrap><Batches /></Wrap>} />
            <Route path="/purchase-orders" element={<Wrap><PurchaseOrders /></Wrap>} />
            <Route path="/markdowns" element={<Wrap><Markdowns /></Wrap>} />
            <Route path="/cfo" element={<Wrap><CFODashboard /></Wrap>} />
            <Route path="/compliance" element={<Wrap><Compliance /></Wrap>} />
            <Route path="/audit" element={<Wrap><AuditLog /></Wrap>} />
            <Route path="/users" element={<Wrap><Users /></Wrap>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
