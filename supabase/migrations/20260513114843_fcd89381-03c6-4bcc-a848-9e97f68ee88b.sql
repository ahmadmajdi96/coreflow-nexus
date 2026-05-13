
-- Copilot feedback
CREATE TABLE public.copilot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment TEXT,
  question TEXT,
  answer TEXT,
  message_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.copilot_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_feedback" ON public.copilot_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_view_own_feedback" ON public.copilot_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "auditors_view_all_feedback" ON public.copilot_feedback
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'cfo'::app_role)
    OR public.has_role(auth.uid(), 'compliance_officer'::app_role)
  );

-- Daily brief subscriptions
CREATE TABLE public.ai_brief_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_brief_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_sub" ON public.ai_brief_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ai_brief_sub_set_updated BEFORE UPDATE ON public.ai_brief_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily briefs
CREATE TABLE public.ai_daily_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date DATE NOT NULL,
  audience_role TEXT NOT NULL DEFAULT 'all',
  headline TEXT,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  links JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brief_date, audience_role)
);
ALTER TABLE public.ai_daily_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_briefs" ON public.ai_daily_briefs
  FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_briefs_date ON public.ai_daily_briefs(brief_date DESC);
CREATE INDEX idx_copilot_feedback_user ON public.copilot_feedback(user_id, created_at DESC);
