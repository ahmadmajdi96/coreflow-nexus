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
import Suppliers from "./pages/Suppliers";
import Batches from "./pages/Batches";
import PurchaseOrders from "./pages/PurchaseOrders";
import Markdowns from "./pages/Markdowns";
import CFODashboard from "./pages/CFODashboard";
import Compliance from "./pages/Compliance";
import AuditLog from "./pages/AuditLog";
import Users from "./pages/Users";
import Valuation from "./pages/Valuation";
import ApprovalRules from "./pages/ApprovalRules";
import StockMovements from "./pages/StockMovements";
import Replenishment from "./pages/Replenishment";
import StockByLocation from "./pages/StockByLocation";
import SalesVelocity from "./pages/SalesVelocity";
import WasteReport from "./pages/WasteReport";
import SupplierPerformance from "./pages/SupplierPerformance";
import Sales from "./pages/Sales";
import SalesReturns from "./pages/SalesReturns";
import SalesSettings from "./pages/SalesSettings";
import SaleDetail from "./pages/SaleDetail";
import FefoHealth from "./pages/FefoHealth";
import NotFound from "./pages/NotFound";
import RoleGuard from "@/components/RoleGuard";

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
            <Route path="/products" element={<Wrap><RoleGuard allowed={["inventory_manager"]}><Products /></RoleGuard></Wrap>} />
            <Route path="/suppliers" element={<Wrap><RoleGuard allowed={["purchasing_manager","system_admin"]}><Suppliers /></RoleGuard></Wrap>} />
            <Route path="/batches" element={<Wrap><RoleGuard allowed={["inventory_manager","compliance_officer"]} readOnlyFor={["compliance_officer"]}><Batches /></RoleGuard></Wrap>} />
            <Route path="/purchase-orders" element={<Wrap><RoleGuard allowed={["purchasing_manager","cfo"]}><PurchaseOrders /></RoleGuard></Wrap>} />
            <Route path="/markdowns" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo"]}><Markdowns /></RoleGuard></Wrap>} />
            <Route path="/cfo" element={<Wrap><RoleGuard allowed={["cfo"]}><CFODashboard /></RoleGuard></Wrap>} />
            <Route path="/compliance" element={<Wrap><RoleGuard allowed={["compliance_officer","cfo","inventory_manager"]} readOnlyFor={["compliance_officer"]}><Compliance /></RoleGuard></Wrap>} />
            <Route path="/audit" element={<Wrap><RoleGuard allowed={["compliance_officer","cfo"]} readOnlyFor={["compliance_officer"]}><AuditLog /></RoleGuard></Wrap>} />
            <Route path="/users" element={<Wrap><RoleGuard allowed={[]}><Users /></RoleGuard></Wrap>} />
            <Route path="/valuation" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo","purchasing_manager"]}><Valuation /></RoleGuard></Wrap>} />
            <Route path="/approval-rules" element={<Wrap><RoleGuard allowed={["purchasing_manager","cfo"]}><ApprovalRules /></RoleGuard></Wrap>} />
            <Route path="/movements" element={<Wrap><RoleGuard allowed={["inventory_manager","purchasing_manager","compliance_officer","cfo"]} readOnlyFor={["compliance_officer","cfo"]}><StockMovements /></RoleGuard></Wrap>} />
            <Route path="/replenishment" element={<Wrap><RoleGuard allowed={["inventory_manager","purchasing_manager","cfo"]}><Replenishment /></RoleGuard></Wrap>} />
            <Route path="/stock-by-location" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo","compliance_officer"]}><StockByLocation /></RoleGuard></Wrap>} />
            <Route path="/sales-velocity" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo","purchasing_manager"]}><SalesVelocity /></RoleGuard></Wrap>} />
            <Route path="/waste" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo","compliance_officer"]}><WasteReport /></RoleGuard></Wrap>} />
            <Route path="/supplier-performance" element={<Wrap><RoleGuard allowed={["purchasing_manager","cfo"]}><SupplierPerformance /></RoleGuard></Wrap>} />
            <Route path="/sales" element={<Wrap><RoleGuard allowed={["inventory_manager","purchasing_manager","cfo","system_admin"]}><Sales /></RoleGuard></Wrap>} />
            <Route path="/sales-returns" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo","system_admin"]}><SalesReturns /></RoleGuard></Wrap>} />
            <Route path="/sales-settings" element={<Wrap><RoleGuard allowed={["cfo","system_admin"]}><SalesSettings /></RoleGuard></Wrap>} />
            <Route path="/sales/:id" element={<Wrap><RoleGuard allowed={["inventory_manager","purchasing_manager","cfo","system_admin"]}><SaleDetail /></RoleGuard></Wrap>} />
            <Route path="/fefo-health" element={<Wrap><RoleGuard allowed={["inventory_manager","cfo","system_admin","compliance_officer"]}><FefoHealth /></RoleGuard></Wrap>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
