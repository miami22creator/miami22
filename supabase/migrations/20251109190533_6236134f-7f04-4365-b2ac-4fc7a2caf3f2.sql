-- Enable RLS on critical tables that expose sensitive trading data
ALTER TABLE public.algorithm_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_correlations ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view algorithm improvements
CREATE POLICY "Authenticated users can view algorithm improvements"
ON public.algorithm_improvements
FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert/update algorithm improvements
CREATE POLICY "Service role can manage algorithm improvements"
ON public.algorithm_improvements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Only authenticated users can view cron executions
CREATE POLICY "Authenticated users can view cron executions"
ON public.cron_executions
FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert cron executions
CREATE POLICY "Service role can manage cron executions"
ON public.cron_executions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Only authenticated users can view price correlations
CREATE POLICY "Authenticated users can view price correlations"
ON public.price_correlations
FOR SELECT
TO authenticated
USING (true);

-- Only service role can insert/update price correlations
CREATE POLICY "Service role can manage price correlations"
ON public.price_correlations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);