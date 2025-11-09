import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'analyst' | 'viewer';

export const useUserRole = () => {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_roles')
        .select('role');
      
      if (error) throw error;
      
      return data.map(r => r.role as UserRole);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useHasRole = (role: UserRole) => {
  const { data: roles = [] } = useUserRole();
  return roles.includes(role);
};

export const useHasAnyRole = (requiredRoles: UserRole[]) => {
  const { data: roles = [] } = useUserRole();
  return requiredRoles.some(role => roles.includes(role));
};

export const useIsAdmin = () => {
  return useHasRole('admin');
};

export const useIsAnalyst = () => {
  return useHasRole('analyst');
};

export const useIsViewer = () => {
  return useHasRole('viewer');
};
