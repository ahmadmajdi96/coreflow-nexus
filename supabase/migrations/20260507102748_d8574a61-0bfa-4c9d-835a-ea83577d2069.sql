
-- Movement type enum
DO $$ BEGIN
  CREATE TYPE public.movement_type AS ENUM ('ADJUSTMENT','TRANSFER','WRITE_OFF','CYCLE_COUNT','RECEIPT','SALE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type public.movement_type NOT NULL,
  product_id uuid NOT NULL,
  batch_id uuid,
  from_store_id uuid,
  to_store_id uuid,
  quantity numeric NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0,
  reason text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_movements" ON public.stock_movements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "write_movements" ON public.stock_movements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'inventory_manager') OR has_role(auth.uid(),'purchasing_manager') OR has_role(auth.uid(),'system_admin'))
  WITH CHECK (has_role(auth.uid(),'inventory_manager') OR has_role(auth.uid(),'purchasing_manager') OR has_role(auth.uid(),'system_admin'));

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at DESC);

-- Reorder + lead time on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reorder_point numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_time_days integer NOT NULL DEFAULT 7;

-- Supplier performance fields
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS lead_time_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS on_time_rate numeric NOT NULL DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS fill_rate numeric NOT NULL DEFAULT 0.97;
