<div align="center">

# 💸 FinanzasIA
### *Tu Asistente Financiero Personal Potenciado con Inteligencia Artificial*

<p align="center">
  <strong>Control total de tus finanzas, escaneo inteligente de comprobantes con Visión Artificial y asesoramiento financiero conversacional en tiempo real.</strong>
</p>

[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-57-000000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Groq](https://img.shields.io/badge/Groq_API-Ultra_Fast_LPU-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com/)
[![License](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge)](LICENSE)

<br/>

📱 **Multiplataforma Nativa:** Android &nbsp;•&nbsp; iOS &nbsp;•&nbsp; Web

---

</div>

## 📌 Tabla de Contenidos

- [✨ Características Principales](#-características-principales)
- [🧠 Modelos de Inteligencia Artificial](#-modelos-de-inteligencia-artificial)
- [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [📂 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔒 Seguridad y Privacidad](#-seguridad-y-privacidad)
- [🗄️ Base de Datos](#️-base-de-datos)
- [🚀 Instalación y Despliegue](#-instalación-y-despliegue)
- [📱 Historias de Usuario Implementadas](#-historias-de-usuario-implementadas)
- [🗺️ Roadmap](#️-roadmap)
- [📄 Licencia](#-licencia)

---

## ✨ Características Principales

| Módulo | Descripción |
|---|---|
| 📸 **Escaneo OCR con Visión IA** | Captura o sube vouchers, tickets y facturas. La IA extrae automáticamente monto, fecha, comercio, categoría y medio de pago. |
| 💬 **Asesor Financiero Personalizado** | Asistente conversacional con contexto financiero real (gastos del mes, tendencias, categorías) que te ayuda a tomar mejores decisiones. |
| 🏷️ **Clasificación Automática Inteligente** | Sugerencia en tiempo real de más de 50 categorías financieras mediante análisis de texto con IA. |
| 🎯 **Metas de Ahorro y Presupuestos** | Define metas con montos objetivos, plazos y visualiza el porcentaje de cumplimiento y proyección en tiempo real. |
| 📊 **Dashboards y Gráficos Interactivos** | Visualización avanzada con gráficos vectoriales SVG (barras, líneas interactivas, desglose por categorías y medios de pago). |
| 🇵🇪 **Optimizado para el Mercado Peruano** | Manejo de moneda nacional (PEN / Soles), soporte nativo para **Yape**, **Plin**, Efectivo, Tarjetas y Transferencias bancarias. |
| 📑 **Exportación Ejecutiva** | Descarga reportes completos de movimientos y balances en formatos **PDF** y **CSV** con un solo toque. |
| 🛡️ **Seguridad Grado Bancario** | Cifrado HTTPS en tránsito, JWT con rotación, y Row Level Security (RLS) en todas las tablas de PostgreSQL. |

---

## 🧠 Modelos de Inteligencia Artificial

La plataforma utiliza **Groq LPUs** para inferencia ultra-rápida (menos de 1 segundo de latencia):

```
                               ┌────────────────────────────┐
                               │       Groq LPU Cloud       │
                               └──────────────┬─────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
      ┌─────────────────────────────┐                   ┌─────────────────────────────┐
      │   Llama 4 Scout (17B)       │                   │    Llama 3.3 (70B)          │
      │   Modalidad: Visión OCR     │                   │    Modalidad: Texto & Razon.│
      ├─────────────────────────────┤                   ├─────────────────────────────┤
      │ • Extracción de vouchers    │                   │ • Asesor financiero en chat │
      │ • Detección de montos       │                   │ • Análisis de patrones      │
      │ • Identificación de comercios│                  │ • Categorización inteligente│
      └─────────────────────────────┘                   └─────────────────────────────┘
```

1. **Llama 4 Scout Vision (`meta-llama/llama-4-scout-17b-16e-instruct`)**:
   - Procesamiento multimodal de imágenes de alta resolución.
   - Extrae con precisión: total, moneda, emisor, fecha y método de pago en un esquema JSON estricto.
   - Sistema de detección y aviso automático si la fotografía está borrosa o ilegible.

2. **Llama 3.3 70B Versatile (`llama-3.3-70b-versatile`)**:
   - Motor para el chatbot financiero contextualizado con métricas del usuario.
   - Clasificación semántica de descripciones en lenguaje natural hacia el catálogo de 50 categorías.

---

## 🏗️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENTE MÓVIL / WEB                             │
│       React Native 0.86 · Expo SDK 57 · TypeScript · Zustand           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS + Bearer JWT
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Supabase Platform)                     │
│  ┌───────────────────────┐                  ┌───────────────────────┐  │
│  │     Supabase Auth     │                  │  PostgreSQL 17 + RLS  │  │
│  │   (JWT, Refresh Token)│                  │ (Políticas por UID)   │  │
│  └───────────────────────┘                  └───────────────────────┘  │
│                                                         ▲              │
│                                                         │ Querys       │
│  ┌──────────────────────────────────────────────────────┴───────────┐  │
│  │                  Edge Functions (Deno Runtime)                   │  │
│  │  • chat-nlp: Asesor financiero con contexto                      │  │
│  │  • procesar-imagen: Pipeline de visión computacional y OCR       │  │
│  │  • clasificar-transaccion: Clasificador semántico de categorías │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ Inferencia API
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           GROQ INFERENCE API                           │
│           Meta LLaMA 4 Scout Vision  ·  Meta LLaMA 3.3 70B             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Estructura del Proyecto

```
finanzas-ia/
├── app/                          # File-based routing (Expo Router v6)
│   ├── _layout.tsx               # Proveedor de sesión y guardias de autenticación
│   ├── (auth)/                   # Módulo de Autenticación
│   │   ├── login.tsx             # Pantalla de acceso
│   │   └── registro.tsx          # Pantalla de registro con validaciones
│   └── (tabs)/                   # Vistas principales de la aplicación
│       ├── _layout.tsx           # Barra de navegación inferior
│       ├── inicio.tsx            # Dashboard: Balance, metas y recomendaciones
│       ├── movimientos.tsx       # Historial de transacciones con filtros y buscador
│       ├── agregar.tsx           # Registro manual + Escaneo OCR con cámara/galería
│       ├── reportes.tsx          # Analítica visual, Chat IA y exportación PDF/CSV
│       └── perfil.tsx            # Gestión de perfil, moneda y configuraciones
│
├── components/                   # Componentes modulares y reutilizables
│   ├── GraficoLinealInteractivo.tsx # Gráfico de evolución de gastos interactivo
│   ├── GraficoResumen.tsx        # Gráfico comparativo de ingresos vs gastos
│   └── Recomendaciones.tsx       # Tarjetas de sugerencias inteligentes
│
├── hooks/                        # Custom React Hooks
│   └── useScreenTracking.ts      # Telemetría y analítica de navegación
│
├── lib/                          # Capa de servicios e integraciones
│   ├── analytics.ts              # Motor de telemetría y eventos de usuario
│   ├── ia.ts                     # Cliente Groq, OCR y clasificación con IA
│   ├── metas.ts                  # Servicios de gestión de metas de ahorro
│   └── supabase.ts               # Cliente cliente Supabase configurado
│
├── supabase/                     # Configuración y backend de Supabase
│   ├── config.toml               # Configuración local de Supabase
│   ├── database_completa.sql     # Script unificado: Tablas, RLS, Vistas y Triggers
│   ├── migrations/               # Migraciones incrementales
│   └── functions/                # Edge Functions (Deno)
│       ├── chat-nlp/             # Asistente financiero conversacional
│       ├── clasificar-transaccion/ # Clasificación de categorías con Llama 3.3
│       └── procesar-imagen/      # Pipeline OCR de imágenes con Llama 4 Scout
│
├── assets/images/                # Recursos gráficos, iconos y splash screen
├── .env.example                  # Plantilla de variables de entorno requeridas
└── package.json                  # Dependencias y scripts de ejecución
```

---

## 🔒 Seguridad y Privacidad

El sistema implementa **7 capas de protección**:

```
[ Capa 1: Transporte ]        Cifrado obligatorio TLS / HTTPS en todos los endpoints
        ↓
[ Capa 2: Identidad ]         Supabase Auth con JWT de corta duración (30 min) y rotación
        ↓
[ Capa 3: Funciones ]         Edge Functions con `verify_jwt = true` obligatorio
        ↓
[ Capa 4: Aislamiento ]       PostgreSQL Row Level Security (RLS) en todas las tablas
        ↓
[ Capa 5: Rate Limiting ]     Protección contra fuerza bruta (30 logins/5min, 100 ev/hr)
        ↓
[ Capa 6: Privilegios ]       Acceso anónimo revocado; sólo el rol `authenticated` tiene permisos
        ↓
[ Capa 7: Políticas ]         Contraseñas seguras con verificación de entropía
```

---

## 🗄️ Base de Datos

El esquema relacional está completamente automatizado y protegido en **PostgreSQL 17**:

- **`perfil`**: Información de usuario, preferencias y moneda seleccionada (`PEN`, `USD`, etc.).
- **`categoria`**: Catálogo de 50 categorías predefinidas clasificadas por tipo (`ingreso`, `gasto`, `ambos`).
- **`movimiento`**: Registro detallado de transacciones, tipo de registro (`manual` vs `ia`), medio de pago y notas.
- **`meta_ahorro`**: Metas de ahorro personales con fecha objetivo, monto actual y estado.
- **`app_event`**: Registro de telemetría y eventos para métricas de retención y uso.
- **`metrica_ia`**: Métricas de rendimiento de llamadas a modelos IA (latencia en ms, tokens consumidos, tasa de acierto).

---

## 🚀 Instalación y Despliegue

### 1. Clonar el Repositorio

```bash
git clone https://github.com/rootander/App-de-Finanzas-Personales-con-IA.git
cd App-de-Finanzas-Personales-con-IA
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo de ejemplo y completa tus credenciales:

```bash
cp .env.example .env
```

Configura en tu `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://tu-proyecto.supabase.co/functions/v1
EXPO_PUBLIC_GROQ_API_KEY=gsk_tu_groq_api_key
```

### 4. Configurar la Base de Datos

En el **SQL Editor** de tu panel de Supabase:
1. Ejecuta el archivo [`supabase/database_completa.sql`](supabase/database_completa.sql).
2. Si ya contabas con una versión previa, aplica la migración [`supabase/migrations/20261031_hu02_hu12_metas_preferencias.sql`](supabase/migrations/20261031_hu02_hu12_metas_preferencias.sql).

### 5. Desplegar Edge Functions de Supabase

```bash
# Iniciar sesión en Supabase CLI
supabase login

# Configurar el secreto de Groq en Supabase
supabase secrets set GROQ_API_KEY=tu_groq_api_key

# Desplegar las funciones serverless
supabase functions deploy chat-nlp
supabase functions deploy clasificar-transaccion
supabase functions deploy procesar-imagen
```

### 6. Iniciar la Aplicación

```bash
# Iniciar con Expo Metro Bundler
npx expo start

# O para plataformas específicas:
npm run android    # En emulador o dispositivo Android
npm run ios        # En simulador o iPhone
npm run web        # En navegador web
```

---

## 📱 Historias de Usuario Implementadas

- [x] **HU01: Autenticación Segura** — Registro, Login y Logout con validación de credenciales.
- [x] **HU02: Perfil y Preferencias** — Configuración de moneda, notificaciones y metas de ahorro.
- [x] **HU03: Registro de Transacciones** — Ingreso manual con categorización y medios de pago.
- [x] **HU04: Escaneo OCR de Comprobantes** — Captura de vouchers y facturas con IA de visión.
- [x] **HU05: Clasificación Inteligente** — Inferencia automática de categorías según la descripción.
- [x] **HU06: Dashboard y Balances** — Resumen financiero en tiempo real, ingresos vs gastos.
- [x] **HU07: Historial y Búsqueda** — Listado reactivo con búsqueda instantánea y filtros temporales.
- [x] **HU08: Analítica y Gráficos** — Gráficos SVG interactivos por semana, mes y año.
- [x] **HU09: Asesor Financiero en Chat** — Chatbot con contexto financiero real para resolver dudas y dar tips.
- [x] **HU10: Exportación de Datos** — Generación y compartición de reportes en PDF y CSV.
- [x] **HU11: Medios de Pago Perú** — Soporte para Yape, Plin, Efectivo, Tarjeta y Transferencia.
- [x] **HU12: Metas de Ahorro con Progreso** — Creación de metas, abonos y barra de avance visual.

---

## 🗺️ Roadmap

- [ ] **Presupuestos Dinámicos por Categoría** con alertas tempranas al superar el 80% del límite.
- [ ] **Modo Offline Completo** con sincronización automática mediante SQLite local y WatermelonDB.
- [ ] **Notificaciones Push** para recordatorios de metas y balance de fin de mes.
- [ ] **Open Banking e Integración Bancaria** mediante APIs financieras seguras.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Puedes usarlo libremente para fines personales, educativos o comerciales. Consulta el archivo de licencia para más detalles.

<div align="center">
  <br/>
  Desarrollado con ❤️ para transformar la salud financiera personal con Inteligencia Artificial.
</div>
