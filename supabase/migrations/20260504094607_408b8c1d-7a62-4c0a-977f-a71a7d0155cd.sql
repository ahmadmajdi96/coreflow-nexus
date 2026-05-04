-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('inventory_manager','purchasing_manager','cfo','compliance_officer','system_admin');
CREATE TYPE public.batch_status AS ENUM ('AVAILABLE','NEAR_EXPIRY','EXPIRED','QUARANTINED','MARKDOWN_ACTIVE');
CREATE TYPE public.po_status AS ENUM ('DRAFT','PENDING_APPROVAL','APPROVED','RECEIVED','CANCELLED');
CREATE TYPE public.markdown_reason AS ENUM ('EXPIRY_PROXIMITY','DEMAND_BELOW_THRESHOLD','PROMOTIONAL');
CREATE TYPE public.markdown_source AS ENUM ('MANUAL','AI_PRICING_ENGINE');
CREATE TYPE public.markdown_status AS ENUM ('PENDING','ACTIVE','EXPIRED','CANCELLED');
CREATE TYPE public.valuation_method AS ENUM ('FIFO','LIFO','WAC');

-- ============== PROFILES ==============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============== ROLES ==============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_role()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) $$;

CREATE POLICY "roles_self_view" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'system_admin'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'system_admin'));

-- ============== AUTO PROFILE + DEFAULT ROLE ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- First user becomes system_admin; others get inventory_manager by default
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'system_admin');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inventory_manager');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'purchasing_manager');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cfo');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'compliance_officer');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inventory_manager');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== MASTER DATA ==============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  rate NUMERIC(5,2) NOT NULL,
  description TEXT
);
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT
);

-- ============== PRODUCTS ==============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  primary_supplier_id UUID REFERENCES public.suppliers(id),
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  default_sales_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_sales_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  expiry_trackable BOOLEAN NOT NULL DEFAULT false,
  shelf_life_days INTEGER,
  sell_by_days INTEGER,
  tax_code_id UUID REFERENCES public.tax_codes(id),
  valuation_method valuation_method NOT NULL DEFAULT 'FIFO',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== INVENTORY BATCHES ==============
CREATE TABLE public.inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  batch_number VARCHAR(30) NOT NULL,
  manufacturing_date DATE,
  expiry_date DATE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_available NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_allocated NUMERIC(10,2) NOT NULL DEFAULT 0,
  status batch_status NOT NULL DEFAULT 'AVAILABLE',
  unit_cost_at_receipt NUMERIC(10,2) NOT NULL DEFAULT 0,
  store_id UUID REFERENCES public.stores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, batch_number)
);

-- ============== PURCHASE ORDERS ==============
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  status po_status NOT NULL DEFAULT 'DRAFT',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  expected_date DATE,
  received_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  received_quantity NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ============== MARKDOWNS ==============
CREATE TABLE public.markdown_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  batch_id UUID REFERENCES public.inventory_batches(id),
  discount_percent NUMERIC(5,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,
  new_price NUMERIC(10,2) NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ,
  reason_code markdown_reason NOT NULL DEFAULT 'EXPIRY_PROXIMITY',
  source_system markdown_source NOT NULL DEFAULT 'MANUAL',
  approved_by UUID REFERENCES auth.users(id),
  status markdown_status NOT NULL DEFAULT 'PENDING',
  financial_impact NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== SALES ==============
CREATE TABLE public.sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  store_id UUID REFERENCES public.stores(id),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  batch_id UUID REFERENCES public.inventory_batches(id),
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- ============== AUDIT LOG ==============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== UPDATED_AT TRIGGERS ==============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== ENABLE RLS ==============
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markdown_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============== POLICIES: read = any authenticated user with a role ==============
-- Master data: any authed can read; admins write
CREATE POLICY "auth_read_categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'system_admin') OR public.has_role(auth.uid(),'inventory_manager')) WITH CHECK (public.has_role(auth.uid(),'system_admin') OR public.has_role(auth.uid(),'inventory_manager'));

CREATE POLICY "auth_read_suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'system_admin') OR public.has_role(auth.uid(),'purchasing_manager')) WITH CHECK (public.has_role(auth.uid(),'system_admin') OR public.has_role(auth.uid(),'purchasing_manager'));

CREATE POLICY "auth_read_taxcodes" ON public.tax_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_taxcodes" ON public.tax_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'system_admin'));

CREATE POLICY "auth_read_stores" ON public.stores FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_stores" ON public.stores FOR ALL TO authenticated USING (public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'system_admin'));

-- Products: inventory manager writes
CREATE POLICY "auth_read_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'inventory_manager') OR public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'inventory_manager') OR public.has_role(auth.uid(),'system_admin'));

-- Batches: inventory + purchasing write
CREATE POLICY "auth_read_batches" ON public.inventory_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_batches" ON public.inventory_batches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'inventory_manager') OR public.has_role(auth.uid(),'purchasing_manager') OR public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'inventory_manager') OR public.has_role(auth.uid(),'purchasing_manager') OR public.has_role(auth.uid(),'system_admin'));

-- POs: purchasing manager
CREATE POLICY "auth_read_po" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_po" ON public.purchase_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'purchasing_manager') OR public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'purchasing_manager') OR public.has_role(auth.uid(),'system_admin'));
CREATE POLICY "auth_read_po_lines" ON public.purchase_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_po_lines" ON public.purchase_order_lines FOR ALL TO authenticated USING (public.has_role(auth.uid(),'purchasing_manager') OR public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'purchasing_manager') OR public.has_role(auth.uid(),'system_admin'));

-- Markdowns: cfo + inventory manager + admin
CREATE POLICY "auth_read_markdowns" ON public.markdown_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "write_markdowns" ON public.markdown_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'cfo') OR public.has_role(auth.uid(),'inventory_manager') OR public.has_role(auth.uid(),'system_admin')) WITH CHECK (public.has_role(auth.uid(),'cfo') OR public.has_role(auth.uid(),'inventory_manager') OR public.has_role(auth.uid(),'system_admin'));

-- Sales: read by all; insert by anyone authed (POS-like)
CREATE POLICY "auth_read_sales" ON public.sales_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sales" ON public.sales_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_read_sales_items" ON public.sales_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sales_items" ON public.sales_items FOR INSERT TO authenticated WITH CHECK (true);

-- Audit: read all authed; insert any authed (server-side)
CREATE POLICY "auth_read_audit" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============== SEED DATA ==============
INSERT INTO public.categories (name) VALUES ('Dairy'),('Bakery'),('Meat'),('Produce'),('Beverages'),('Frozen');
INSERT INTO public.tax_codes (code, rate, description) VALUES ('STD',20,'Standard rate'),('RED',5,'Reduced rate'),('ZERO',0,'Zero rated');
INSERT INTO public.stores (store_code, name, location) VALUES ('ST-001','Main Store','Downtown');
INSERT INTO public.suppliers (name, contact_email) VALUES ('DairyCo Ltd.','orders@dairyco.com'),('Bakers United','sales@bakers.com'),('FreshMeat Co','contact@freshmeat.com');
