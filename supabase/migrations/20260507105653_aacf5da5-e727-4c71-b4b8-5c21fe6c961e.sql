-- App settings (singleton row)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sell_by_buffer_days integer NOT NULL DEFAULT 0,
  sales_approval_threshold numeric NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'cfo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'cfo'::app_role));
INSERT INTO public.app_settings (sell_by_buffer_days, sales_approval_threshold) VALUES (0, 5000);

-- Sales transaction extensions
ALTER TABLE public.sales_transactions
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.sales_items
  ADD COLUMN IF NOT EXISTS line_note text;

-- Returns
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number text NOT NULL UNIQUE,
  original_transaction_id uuid REFERENCES public.sales_transactions(id) ON DELETE SET NULL,
  reason text,
  total_amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_returns" ON public.sales_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_returns" ON public.sales_returns FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'inventory_manager'::app_role) OR has_role(auth.uid(),'system_admin'::app_role) OR has_role(auth.uid(),'cfo'::app_role)
);

CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  batch_id uuid,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  original_sales_item_id uuid
);
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read_return_items" ON public.sales_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_return_items" ON public.sales_return_items FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'inventory_manager'::app_role) OR has_role(auth.uid(),'system_admin'::app_role) OR has_role(auth.uid(),'cfo'::app_role)
);

-- Trigger: credit batch quantity back on return
CREATE OR REPLACE FUNCTION public.apply_sale_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.batch_id IS NOT NULL THEN
    UPDATE public.inventory_batches
       SET quantity_available = quantity_available + NEW.quantity,
           status = CASE WHEN status = 'DEPLETED'::batch_status AND (quantity_available + NEW.quantity) > 0
                         THEN 'AVAILABLE'::batch_status ELSE status END
     WHERE id = NEW.batch_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_sale_return ON public.sales_return_items;
CREATE TRIGGER trg_apply_sale_return
  AFTER INSERT ON public.sales_return_items
  FOR EACH ROW EXECUTE FUNCTION public.apply_sale_return();