# Trading Signal Predictor 📈

Sistema de predicción de señales CALL/PUT en tiempo real con análisis técnico avanzado e indicadores de mercado.

## 🎯 Características

- **Dashboard en tiempo real** con señales CALL/PUT
- **Indicadores técnicos avanzados**: RSI, MACD, Bollinger Bands, EMA, Volume, ATR
- **Sistema de alertas** automáticas
- **Múltiples activos**: TSLA, NVDA, SPY, GLD, AMD, PLTR, MSTR y más
- **Análisis de confianza** basado en confluencia de indicadores
- **Diseño profesional** optimizado para trading

## 🚀 Activos Soportados

- **Tech & IA**: Tesla (TSLA), NVIDIA (NVDA), AMD, Palantir (PLTR)
- **Índices**: S&P 500 (SPY)
- **Materias primas**: Oro (GLD)
- **Crypto-relacionados**: MicroStrategy (MSTR)

## 🔧 Tecnologías

- React + TypeScript
- Vite
- Tailwind CSS
- Shadcn/ui
- React Query

## 📊 Indicadores Implementados

1. **RSI (Relative Strength Index)**: Sobrecompra/sobreventa
2. **MACD**: Momentum y dirección de tendencia
3. **Bollinger Bands**: Volatilidad y rupturas
4. **EMA 50/200**: Cruces de medias móviles
5. **Volume**: Confirmación de fuerza
6. **ATR**: Volatilidad y stop-loss

## 🔌 Conexión con Backend

Este frontend está diseñado para conectarse con un backend FastAPI. Para integrar tu backend:

### 1. Crear servicio de API

Crea un archivo `src/services/tradingApi.ts`:

```typescript
const API_URL = 'http://localhost:8000'; // URL de tu backend FastAPI

export const fetchSignals = async () => {
  const response = await fetch(`${API_URL}/signals`);
  return response.json();
};

export const fetchPrediction = async (data: { rsi: number; macd: number; obv_change: number }) => {
  const response = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
};
```

### 2. Usar React Query para datos en tiempo real

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchSignals } from '@/services/tradingApi';

const { data: signals } = useQuery({
  queryKey: ['signals'],
  queryFn: fetchSignals,
  refetchInterval: 60000, // Actualizar cada minuto
});
```

### 3. WebSocket para actualizaciones en vivo

Para implementar WebSocket con tu backend:

```typescript
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Actualizar señales en tiempo real
  };
  
  return () => ws.close();
}, []);
```

## 📦 Instalación

```bash
npm install
npm run dev
```

## 🌐 Deploy

Este proyecto está optimizado para deploy en:
- GitHub Pages
- Vercel
- Netlify
- Render

## 📚 Estructura del Proyecto

```
src/
├── components/         # Componentes de UI
│   ├── TradingHeader   # Header con estado en vivo
│   ├── MarketOverview  # Resumen de mercado
│   ├── SignalCard      # Tarjetas de señales individuales
│   ├── IndicatorPanel  # Panel de indicadores técnicos
│   └── AlertsPanel     # Panel de alertas recientes
├── pages/             # Páginas de la aplicación
│   └── Index          # Dashboard principal
└── services/          # Servicios de API (añadir aquí)
```

## 🎨 Personalización

El sistema de diseño está completamente personalizado para trading:
- **Verde (success)**: Señales CALL, tendencias alcistas
- **Rojo (destructive)**: Señales PUT, tendencias bajistas
- **Tema oscuro**: Optimizado para largas sesiones de trading

Personaliza colores en `src/index.css` usando variables CSS.

## 🔐 Seguridad

- Nunca expongas API keys en el frontend
- Usa variables de entorno para URLs de producción
- Implementa autenticación si es necesario

## 📈 Próximas Características

- [ ] Gráficos interactivos con TradingView
- [ ] Notificaciones push de alertas
- [ ] Histórico de señales
- [ ] Backtesting de estrategias
- [ ] Integración con brokers

## 📞 Soporte

Para más información sobre los indicadores y estrategias implementadas, consulta la documentación del proyecto.
