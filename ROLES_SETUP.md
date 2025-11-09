# Sistema de Roles - Guía de Configuración

## ✅ Implementación Completada

Se ha implementado un sistema de roles con tres niveles de acceso:

### 🛡️ **Admin**
- **Permisos completos**: Gestión de usuarios, sistema y algoritmos
- **Acceso a**:
  - Todas las tablas y funciones
  - Panel de gestión de roles
  - Logs de ejecución de cron jobs
  - Mejoras del algoritmo
  - Correlaciones de precios

### 📊 **Analyst** 
- **Análisis avanzado**: Señales, indicadores y mejoras del algoritmo
- **Acceso a**:
  - Todas las señales y datos de mercado
  - Indicadores técnicos
  - Mejoras del algoritmo
  - Correlaciones de precios
- **Restricciones**: No puede ver logs del sistema ni gestionar usuarios

### 👁️ **Viewer**
- **Solo lectura**: Visualización de señales y datos de mercado
- **Acceso a**:
  - Señales de trading
  - Indicadores técnicos
  - Alertas
  - Noticias de mercado
- **Restricciones**: No puede generar señales ni ver análisis del algoritmo

## 📋 Configuración Inicial

### 1. Asignar el primer Admin

Para asignar el rol de admin al usuario actual, necesitas ejecutar este SQL en tu backend:

1. Ve a tu backend (Lovable Cloud)
2. Abre la consola SQL
3. Ejecuta este comando reemplazando `TU_USER_ID` con tu ID de usuario:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('TU_USER_ID', 'admin');
```

**Para obtener tu User ID:**
```sql
-- Ejecuta este query para ver tu user_id
SELECT auth.uid();
```

O desde la aplicación, abre la consola del navegador y ejecuta:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Mi User ID:', user.id);
```

### 2. Usar el Panel de Gestión

Una vez tengas rol de admin:
1. Inicia sesión en la aplicación
2. Verás el panel "Gestión de Roles de Usuario" en la página principal
3. Desde ahí podrás asignar roles a otros usuarios

## 🔒 Políticas de Seguridad Implementadas

### Tablas con Acceso por Rol

| Tabla | Admin | Analyst | Viewer |
|-------|-------|---------|--------|
| `trading_signals` | ✅ | ✅ | ✅ |
| `technical_indicators` | ✅ | ✅ | ✅ |
| `alerts` | ✅ | ✅ | ✅ |
| `assets` | ✅ | ✅ | ✅ |
| `market_news` | ✅ | ✅ | ✅ |
| `social_posts` | ✅ | ✅ | ✅ |
| `influencers` | ✅ | ✅ | ✅ |
| `algorithm_improvements` | ✅ | ✅ | ❌ |
| `price_correlations` | ✅ | ✅ | ❌ |
| `cron_executions` | ✅ | ❌ | ❌ |
| `user_roles` | ✅ | ❌ | ❌ |

### Funciones de Seguridad

Se crearon dos funciones para verificar roles:

```sql
-- Verificar si un usuario tiene un rol específico
SELECT public.has_role(auth.uid(), 'admin');

-- Verificar si un usuario tiene cualquiera de varios roles
SELECT public.has_any_role(auth.uid(), ARRAY['admin', 'analyst']::app_role[]);
```

## 🔧 Uso en la Aplicación

### Hooks de React Disponibles

```typescript
import { 
  useUserRole,      // Obtener todos los roles del usuario
  useHasRole,       // Verificar un rol específico
  useHasAnyRole,    // Verificar múltiples roles
  useIsAdmin,       // Atajo para verificar admin
  useIsAnalyst,     // Atajo para verificar analyst
  useIsViewer       // Atajo para verificar viewer
} from "@/hooks/useUserRole";

// Ejemplo de uso
const MyComponent = () => {
  const isAdmin = useIsAdmin();
  const { data: roles } = useUserRole();
  
  if (!isAdmin) {
    return <div>Acceso denegado</div>;
  }
  
  return <div>Panel de administración</div>;
};
```

## ⚠️ Advertencias de Seguridad Restantes

Después de la implementación, quedan 2 advertencias menores:

1. **Extension in Public Schema**: La extensión `pg_net` está en el schema público. Esto es gestionado por Supabase y es seguro.

2. **Leaked Password Protection Disabled**: La protección contra contraseñas filtradas está deshabilitada. Para habilitarla:
   - Ve a tu backend → Authentication → Policies
   - Activa "Breach Protection"

## 🚀 Próximos Pasos Recomendados

1. **Asignar primer admin** (instrucciones arriba)
2. **Crear usuarios analyst y viewer** usando el panel de gestión
3. **Habilitar JWT en Edge Functions** para prevenir acceso no autorizado
4. **Agregar validación de entrada** en las edge functions
5. **Implementar rate limiting** para prevenir abuso

## 📚 Recursos

- [Documentación de RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [Documentación de Security en Lovable](https://docs.lovable.dev/features/security)
