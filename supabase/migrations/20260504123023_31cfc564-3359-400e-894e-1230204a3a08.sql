-- Update handle_new_user to assign role-appropriate permissions to demo accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  email_local text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  email_local := lower(split_part(NEW.email, '@', 1));

  -- First user ever → all roles (system bootstrap)
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES
      (NEW.id, 'system_admin'),
      (NEW.id, 'inventory_manager'),
      (NEW.id, 'purchasing_manager'),
      (NEW.id, 'cfo'),
      (NEW.id, 'compliance_officer');
  -- Demo accounts: grant full role set so all demo logins have full feature access
  ELSIF NEW.email LIKE '%@coreerp.demo' THEN
    IF email_local = 'admin' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES
        (NEW.id, 'system_admin'),
        (NEW.id, 'inventory_manager'),
        (NEW.id, 'purchasing_manager'),
        (NEW.id, 'cfo'),
        (NEW.id, 'compliance_officer');
    ELSIF email_local = 'inventory' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inventory_manager');
    ELSIF email_local = 'purchasing' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'purchasing_manager');
    ELSIF email_local = 'cfo' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cfo');
    ELSIF email_local = 'compliance' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'compliance_officer');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inventory_manager');
    END IF;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'inventory_manager');
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();