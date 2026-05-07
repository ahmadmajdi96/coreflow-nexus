
CREATE OR REPLACE FUNCTION public.test_fefo_firing()
RETURNS TABLE(fired boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fake uuid := '00000000-0000-0000-0000-000000000000';
  err_msg text;
BEGIN
  -- Restrict to admin/cfo
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
       OR public.has_role(auth.uid(), 'cfo'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized to run FEFO firing test';
  END IF;

  BEGIN
    INSERT INTO public.sales_items (transaction_id, product_id, batch_id, quantity, unit_price)
    VALUES (fake, fake, fake, 1, 0);
    -- If we get here, trigger did not fire
    -- Roll back the insert defensively
    RAISE EXCEPTION 'NO_TRIGGER_FIRED';
  EXCEPTION
    WHEN OTHERS THEN
      err_msg := SQLERRM;
      IF err_msg = 'NO_TRIGGER_FIRED' THEN
        fired := false;
        message := 'Trigger did NOT fire — fake insert succeeded.';
      ELSE
        fired := true;
        message := err_msg;
      END IF;
      RETURN NEXT;
      RETURN;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.test_fefo_firing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_fefo_firing() TO authenticated;
