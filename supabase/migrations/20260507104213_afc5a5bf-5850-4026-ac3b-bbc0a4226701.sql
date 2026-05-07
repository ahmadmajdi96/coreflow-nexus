
-- Guard sales: block expired batches and over-allocation; auto-decrement batch on sale
CREATE OR REPLACE FUNCTION public.enforce_sale_fefo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.inventory_batches%ROWTYPE;
BEGIN
  IF NEW.batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO b FROM public.inventory_batches WHERE id = NEW.batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', NEW.batch_id;
  END IF;

  IF b.expiry_date IS NOT NULL AND b.expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot sell expired batch % (expired %)', b.batch_number, b.expiry_date;
  END IF;

  IF b.status <> 'AVAILABLE' THEN
    RAISE EXCEPTION 'Batch % is not available (status=%)', b.batch_number, b.status;
  END IF;

  IF NEW.quantity > b.quantity_available THEN
    RAISE EXCEPTION 'Requested qty % exceeds available % for batch %', NEW.quantity, b.quantity_available, b.batch_number;
  END IF;

  UPDATE public.inventory_batches
     SET quantity_available = quantity_available - NEW.quantity,
         status = CASE WHEN quantity_available - NEW.quantity <= 0 THEN 'DEPLETED'::batch_status ELSE status END
   WHERE id = NEW.batch_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sale_fefo ON public.sales_items;
CREATE TRIGGER trg_enforce_sale_fefo
BEFORE INSERT ON public.sales_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_fefo();
