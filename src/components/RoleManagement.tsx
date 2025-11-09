import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserCog, Eye, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";

type Role = 'admin' | 'analyst' | 'viewer';

interface UserRole {
  id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

const roleIcons = {
  admin: Shield,
  analyst: UserCog,
  viewer: Eye,
};

const roleColors = {
  admin: "destructive",
  analyst: "default",
  viewer: "secondary",
} as const;

const roleDescriptions = {
  admin: "Acceso completo: gestión de usuarios, sistema y algoritmos",
  analyst: "Análisis avanzado: señales, indicadores y mejoras del algoritmo",
  viewer: "Solo lectura: visualización de señales y datos de mercado",
};

export const RoleManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<Role>("viewer");

  // Fetch all user roles
  const { data: userRoles = [], isLoading } = useQuery({
    queryKey: ['all-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: isAdmin,
  });

  // Fetch all users (from auth.users via a function or manual entry)
  const { data: users = [] } = useQuery({
    queryKey: ['auth-users'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // For now, just return current user since we can't query auth.users directly
      return user ? [{ id: user.id, email: user.email }] : [];
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({
        title: "Rol asignado",
        description: "El rol se ha asignado correctamente al usuario.",
      });
      setSelectedUserId("");
      setSelectedRole("viewer");
    },
    onError: (error: any) => {
      toast({
        title: "Error al asignar rol",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast({
        title: "Rol eliminado",
        description: "El rol se ha eliminado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar rol",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestión de Roles
          </CardTitle>
          <CardDescription>
            Solo los administradores pueden gestionar roles de usuario
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Gestión de Roles de Usuario
        </CardTitle>
        <CardDescription>
          Asigna y gestiona roles para controlar el acceso a diferentes funcionalidades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Descriptions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Tipos de Roles</h3>
          {(Object.entries(roleDescriptions) as [Role, string][]).map(([role, description]) => {
            const Icon = roleIcons[role];
            return (
              <div key={role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={roleColors[role]} className="capitalize">
                      {role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Role Form */}
        <div className="space-y-4 p-4 rounded-lg border">
          <h3 className="text-sm font-medium">Asignar Nuevo Rol</h3>
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => addRoleMutation.mutate({ userId: selectedUserId, role: selectedRole })}
              disabled={!selectedUserId || addRoleMutation.isPending}
            >
              Asignar
            </Button>
          </div>
        </div>

        {/* Current Roles */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Roles Actuales</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando roles...</p>
          ) : userRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay roles asignados</p>
          ) : (
            <div className="space-y-2">
              {userRoles.map((userRole) => {
                const Icon = roleIcons[userRole.role as Role];
                return (
                  <div
                    key={userRole.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{userRole.user_id.slice(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(userRole.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={roleColors[userRole.role as Role]} className="capitalize">
                        {userRole.role}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRoleMutation.mutate(userRole.id)}
                        disabled={removeRoleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
