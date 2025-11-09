-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.my_roles;

CREATE OR REPLACE VIEW public.my_roles 
WITH (security_invoker = true)
AS
SELECT role
FROM public.user_roles
WHERE user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.my_roles TO authenticated;