UPDATE public.approval_rules ar
SET budget_spent_mtd = COALESCE((
  SELECT SUM(po.total_amount)
  FROM public.purchase_orders po
  WHERE po.department = ar.department
    AND po.created_at >= date_trunc('month', current_date)
    AND po.status != 'CANCELLED'
), 0);