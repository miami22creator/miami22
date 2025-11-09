-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for sensitive tables

-- CRON EXECUTIONS: Admin only
DROP POLICY IF EXISTS "Authenticated users can view cron executions" ON public.cron_executions;
CREATE POLICY "Admins can view cron executions"
  ON public.cron_executions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ALGORITHM IMPROVEMENTS: Admin and Analyst can view
DROP POLICY IF EXISTS "Authenticated users can view algorithm improvements" ON public.algorithm_improvements;
CREATE POLICY "Admin and analysts can view algorithm improvements"
  ON public.algorithm_improvements FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- PRICE CORRELATIONS: Admin and Analyst can view
DROP POLICY IF EXISTS "Authenticated users can view price correlations" ON public.price_correlations;
CREATE POLICY "Admin and analysts can view price correlations"
  ON public.price_correlations FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]));

-- TRADING SIGNALS: All authenticated users can view (viewer, analyst, admin)
-- Keep existing policy

-- TECHNICAL INDICATORS: All authenticated users can view
-- Keep existing policy

-- ALERTS: All authenticated users can view
-- Keep existing policy

-- ASSETS, MARKET NEWS, SOCIAL POSTS, INFLUENCERS: All authenticated users can view
-- Keep existing policies

-- Create a view to easily check current user's roles
CREATE OR REPLACE VIEW public.my_roles AS
SELECT role
FROM public.user_roles
WHERE user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.my_roles TO authenticated;