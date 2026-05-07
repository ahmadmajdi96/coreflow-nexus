
-- Ensure triggers exist on sales_items and sales_return_items (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_sale_fefo ON public.sales_items;
CREATE TRIGGER trg_enforce_sale_fefo
BEFORE INSERT ON public.sales_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_fefo();

DROP TRIGGER IF EXISTS trg_apply_sale_return ON public.sales_return_items;
CREATE TRIGGER trg_apply_sale_return
BEFORE INSERT ON public.sales_return_items
FOR EACH ROW EXECUTE FUNCTION public.apply_sale_return();

-- Inspector RPC: returns trigger health for the FEFO subsystem
CREATE OR REPLACE FUNCTION public.check_fefo_triggers()
RETURNS TABLE(trigger_name text, table_name text, function_name text, enabled boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT t.tgname::text,
         (n.nspname || '.' || c.relname)::text,
         p.proname::text,
         (NOT t.tgenabled = 'D')
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE NOT t.tgisinternal
    AND n.nspname = 'public'
    AND t.tgname IN ('trg_enforce_sale_fefo', 'trg_apply_sale_return');
$$;

GRANT EXECUTE ON FUNCTION public.check_fefo_triggers() TO authenticated;
