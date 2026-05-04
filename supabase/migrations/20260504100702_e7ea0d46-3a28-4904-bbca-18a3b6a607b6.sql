
-- Receipt workflow status on POs
DO $$ BEGIN
  CREATE TYPE public.receipt_status AS ENUM ('DRAFT','SUBMITTED','POSTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS receipt_status public.receipt_status NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS receipt_submitted_by uuid,
  ADD COLUMN IF NOT EXISTS receipt_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS receipt_posted_by uuid,
  ADD COLUMN IF NOT EXISTS receipt_posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS department text;

-- Configurable approval rules per department
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  budget_allocated numeric NOT NULL DEFAULT 0,
  budget_spent_mtd numeric NOT NULL DEFAULT 0,
  threshold_l1 numeric NOT NULL DEFAULT 5000,
  threshold_l2 numeric NOT NULL DEFAULT 25000,
  approver_l1_role text NOT NULL DEFAULT 'purchasing_manager',
  approver_l2_role text NOT NULL DEFAULT 'cfo',
  approver_l3_role text NOT NULL DEFAULT 'system_admin',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department)
);

ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_rules" ON public.approval_rules;
CREATE POLICY "auth_read_rules" ON public.approval_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_rules" ON public.approval_rules;
CREATE POLICY "admin_write_rules" ON public.approval_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'cfo'::app_role))
  WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role) OR has_role(auth.uid(), 'cfo'::app_role));

CREATE TRIGGER trg_approval_rules_updated_at BEFORE UPDATE ON public.approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default departments
INSERT INTO public.approval_rules (department, budget_allocated, budget_spent_mtd, threshold_l1, threshold_l2)
VALUES
  ('Operations', 50000, 32400, 5000, 25000),
  ('Fresh Produce', 80000, 41200, 7500, 30000),
  ('Bakery', 35000, 18900, 3000, 15000),
  ('Pharmacy', 120000, 65000, 10000, 50000)
ON CONFLICT (department) DO NOTHING;
