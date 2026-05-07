ALTER TABLE public.sales_transactions
  ADD COLUMN IF NOT EXISTS posted_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_by uuid,
  ADD COLUMN IF NOT EXISTS pending_cart jsonb;

ALTER TABLE public.sales_items
  ADD COLUMN IF NOT EXISTS quantity_returned numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.apply_sale_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  si public.sales_items%ROWTYPE;
  b public.inventory_batches%ROWTYPE;
BEGIN
  -- Validate against the original sales item if provided
  IF NEW.original_sales_item_id IS NOT NULL THEN
    SELECT * INTO si FROM public.sales_items WHERE id = NEW.original_sales_item_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Original sales item % not found', NEW.original_sales_item_id;
    END IF;
    IF si.batch_id IS DISTINCT FROM NEW.batch_id THEN
      RAISE EXCEPTION 'Return batch must match original sale batch';
    END IF;
    IF si.product_id IS DISTINCT FROM NEW.product_id THEN
      RAISE EXCEPTION 'Return product must match original sale product';
    END IF;
    IF (si.quantity - si.quantity_returned) < NEW.quantity THEN
      RAISE EXCEPTION 'Return qty % exceeds remaining returnable qty %', NEW.quantity, (si.quantity - si.quantity_returned);
    END IF;
    UPDATE public.sales_items
       SET quantity_returned = quantity_returned + NEW.quantity
     WHERE id = NEW.original_sales_item_id;
  END IF;

  -- Credit batch
  IF NEW.batch_id IS NOT NULL THEN
    SELECT * INTO b FROM public.inventory_batches WHERE id = NEW.batch_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch % not found', NEW.batch_id;
    END IF;
    IF b.expiry_date IS NOT NULL AND b.expiry_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Cannot return to expired batch % (expired %)', b.batch_number, b.expiry_date;
    END IF;
    UPDATE public.inventory_batches
       SET quantity_available = quantity_available + NEW.quantity,
           status = CASE WHEN status = 'DEPLETED'::batch_status AND (quantity_available + NEW.quantity) > 0
                         THEN 'AVAILABLE'::batch_status ELSE status END
     WHERE id = NEW.batch_id;
  END IF;

  RETURN NEW;
END $$;