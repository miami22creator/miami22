# Trading Signal Predictor 📈

Sistema profesional de predicción de señales CALL/PUT en tiempo real con análisis técnico avanzado, backend integrado y actualizaciones en vivo.

## 🎯 Características

- **Dashboard en tiempo real** con señales CALL/PUT actualizadas automáticamente
- **Backend completo integrado** con Lovable Cloud (Supabase)
- **Indicadores técnicos avanzados**: RSI, MACD, Bollinger Bands, EMA, Volume, ATR
- **Sistema de alertas** automáticas con notificaciones
- **Base de datos** para historial de señales e indicadores
- **Edge Functions** para cálculos de señales
- **Actualizaciones en tiempo real** mediante WebSockets
- **Múltiples activos**: TSLA, NVDA, SPY, GLD, AMD, PLTR, MSTR, ETH, AVAX, LINK

## 🚀 Arquitectura

### Frontend
- React + TypeScript + Vite
- Tailwind CSS para diseño profesional
- React Query para gestión de estado
- Supabase Realtime para actualizaciones en vivo

### Backend (Lovable Cloud)
- Base de datos PostgreSQL con RLS
- Edge Functions para cálculos
- Sistema de notificaciones en tiempo real
- Almacenamiento de historial

## 📊 Base de Datos

### Tablas Principales

**assets**: Activos seguidos (TSLA, NVDA, SPY, etc.)
**trading_signals**: Señales CALL/PUT con confianza y precios
**technical_indicators**: Indicadores técnicos calculados
**alerts**: Alertas de alta confianza (>75%)

## 🔧 Edge Functions

### calculate-indicators
Calcula indicadores técnicos y genera señales para un activo.

**Endpoint**: `/functions/v1/calculate-indicators`

**Request**:
```json
{
  "assetSymbol": "TSLA"
}
```

**Response**:
```json
{
  "success": true,
  "signal": {
    "type": "CALL",
    "confidence": 85,
    "price": 242.50,
    "change": 3.2,
    "message": "RSI en zona de sobreventa. MACD positivo. Cruce dorado detectado."
  },
  "indicators": {
    "rsi": 28.5,
    "macd": 0.85,
    "ema_50": 245.80,
    "ema_200": 238.20
  }
}
```

### get-latest-signals
Obtiene las últimas señales con indicadores.

**Endpoint**: `/functions/v1/get-latest-signals`

## 🎨 Sistema de Diseño

- **Verde (success)**: Señales CALL, tendencias alcistas
- **Rojo (destructive)**: Señales PUT, tendencias bajistas
- **Tema oscuro**: Optimizado para trading profesional
- **Responsive**: Funciona en desktop, tablet y móvil

## 🔌 Generación de Señales

Para generar señales para un activo específico, puedes llamar a la función desde el navegador:

```javascript
const response = await fetch('https://tu-proyecto.supabase.co/functions/v1/calculate-indicators', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    assetSymbol: 'TSLA'
  })
});

const data = await response.json();
console.log(data);
```

O usar el cliente de Supabase:

```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('calculate-indicators', {
  body: { assetSymbol: 'NVDA' }
});
```

## 📈 Lógica de Señales

El sistema analiza múltiples indicadores para generar señales:

### Señal CALL (Compra)
- RSI < 30 (sobreventa): +15% confianza
- MACD > 0 (momentum positivo): +10% confianza
- EMA 50 > EMA 200 (cruce dorado): +10% confianza

### Señal PUT (Venta)
- RSI > 70 (sobrecompra): +15% confianza
- MACD < 0 (momentum negativo): +10% confianza
- EMA 50 < EMA 200 (cruce de muerte): +10% confianza

### Alertas Automáticas
Cuando una señal tiene confianza >= 75%, se crea automáticamente una alerta que aparece en el panel de alertas.

## 🔐 Seguridad

- Row Level Security (RLS) habilitado en todas las tablas
- Políticas de acceso público para visualización (dashboard público)
- Edge Functions con CORS configurado
- Validación de datos en backend

## 📦 Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

## 🌐 Deploy

El proyecto está configurado para deploy automático en Lovable. Los cambios se despliegan automáticamente cuando guardas el proyecto.

## 🔄 Actualizaciones en Tiempo Real

El dashboard se suscribe a cambios en las tablas `trading_signals` y `alerts` mediante Supabase Realtime. Cualquier nueva señal o alerta aparece automáticamente sin necesidad de recargar la página.

## 📚 Próximas Características

- [ ] Integración con APIs externas (TradingView, Yahoo Finance)
- [ ] Gráficos interactivos con TradingView widgets
- [ ] Notificaciones push y por email
- [ ] Sistema de backtesting
- [ ] Filtros avanzados por activo y confianza
- [ ] Autenticación de usuarios
- [ ] Configuración personalizada de alertas
- [ ] Exportación de datos históricos
- [ ] API pública para acceso programático

## 🛠️ Personalización

### Agregar Nuevos Activos

```sql
INSERT INTO public.assets (symbol, name, type) 
VALUES ('BTC', 'Bitcoin', 'crypto');
```

### Ajustar Lógica de Señales

Edita la función `generateSignal()` en `supabase/functions/calculate-indicators/index.ts` para modificar cómo se calculan las señales y niveles de confianza.

### Conectar con APIs Externas

Para obtener datos reales de mercado, necesitarás agregar secrets y modificar la función `calculateTechnicalIndicators()`:

1. Agrega tu API key como secret en Lovable Cloud
2. Modifica la función para hacer requests a TradingView, Yahoo Finance, etc.
3. Procesa los datos reales en lugar de los simulados

## 📞 Soporte

Este es un sistema base que puede ser extendido según tus necesidades. Para agregar más funcionalidades como:
- Integración con brokers
- Trading automático
- Machine Learning para predicciones
- Análisis de sentimiento de noticias

Contacta al equipo de desarrollo.

## ⚠️ Disclaimer

Este sistema es solo para propósitos educativos y de demostración. Las señales generadas son simuladas y no deben ser usadas para tomar decisiones de inversión reales. Siempre consulta con un asesor financiero profesional antes de invertir.

## 📄 Licencia

MIT License - Uso libre para propósitos educativos y comerciales.
