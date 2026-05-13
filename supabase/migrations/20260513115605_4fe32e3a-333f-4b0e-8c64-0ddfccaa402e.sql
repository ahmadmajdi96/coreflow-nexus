
ALTER TABLE public.ai_brief_subscriptions
  ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekdays','weekly')),
  ADD COLUMN IF NOT EXISTS delivery_hour SMALLINT NOT NULL DEFAULT 7 CHECK (delivery_hour BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS team TEXT;

CREATE POLICY "admins_view_all_subs" ON public.ai_brief_subscriptions
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'cfo'::app_role)
  );
