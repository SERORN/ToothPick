# 🦷 ToothPick - Plataforma Dental Profesional

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.3-black.svg)](https://nextjs.org)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-blue.svg)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://docker.com)

**ToothPick** es una plataforma dental integral que conecta dentistas, pacientes y proveedores en un ecosistema digital completo. Incluye gestión de citas, marketplace B2B, sistema de pagos, analytics y aplicación móvil nativa.

## 🚀 Características Principales

### 🏥 Para Dentistas
- **Dashboard Profesional** - Vista completa de práctica dental
- **Gestión de Citas** - Agenda inteligente con recordatorios automáticos
- **Historial de Pacientes** - Expedientes digitales completos
- **Analytics Avanzados** - Métricas de rendimiento y ingresos
- **Facturación CFDI** - Cumplimiento fiscal mexicano
- **Integración con Equipos** - Conecta con sistemas dentales

### 👥 Para Pacientes
- **Portal Personal** - Acceso completo a su historial médico
- **Reserva de Citas** - Agenda online 24/7
- **Recordatorios Inteligentes** - SMS, email y push notifications
- **Expediente Digital** - Historial, tratamientos y estudios
- **Pagos Online** - Múltiples métodos de pago seguros
- **Telemedicina** - Consultas virtuales

### 🏪 Marketplace B2B
- **Catálogo Completo** - +10,000 productos dentales
- **Precios Especiales** - Descuentos para profesionales
- **Gestión de Inventario** - Control de stock en tiempo real
- **Órdenes Automatizadas** - Compras recurrentes
- **Logística Integrada** - Seguimiento de envíos
- **Facturación B2B** - Crédito y términos comerciales

### 📱 Aplicación Móvil
- **iOS & Android** - Apps nativas con Expo
- **Sincronización** - Datos en tiempo real
- **Notificaciones Push** - Recordatorios y alertas
- **Modo Offline** - Funcionalidad sin internet
- **Geolocalización** - Encuentra dentistas cercanos
- **Cámara Integrada** - Captura de documentos

## 🏗️ Arquitectura Técnica

### Backend (FastAPI + PostgreSQL)
```
backend/
├── app/
│   ├── models/          # Modelos SQLAlchemy
│   ├── services/        # Lógica de negocio
│   ├── routers/         # Endpoints API REST
│   ├── database.py      # Configuración DB
│   └── auth.py          # Autenticación JWT
├── main.py              # Punto de entrada
├── requirements.txt     # Dependencias Python
└── Dockerfile          # Imagen Docker
```

### Frontend (Next.js 15 + TypeScript)
```
tooth-pick/
├── app/                 # App Router Next.js 15
├── components/          # Componentes React
├── lib/                 # Utilidades y configuración
├── types/               # Definiciones TypeScript
├── public/              # Assets estáticos
├── package.json         # Dependencias Node.js
└── Dockerfile          # Imagen Docker
```

### Mobile (React Native + Expo)
```
mobile/
├── app/                 # Pantallas de la app
├── components/          # Componentes React Native
├── services/            # API y servicios
├── store/               # Estado global (Redux)
├── app.json             # Configuración Expo
└── package.json         # Dependencias
```

### Landing Page (HTML + CSS + JS)
```
landing/
├── index.html           # Página principal
├── package.json         # Servidor de desarrollo
└── Dockerfile          # Imagen Docker
```

## 🛠️ Instalación y Setup

### Requisitos Previos
- **Docker & Docker Compose** - Para contenedores
- **Node.js 18+** - Para frontend y mobile
- **Python 3.11+** - Para backend
- **Git** - Control de versiones

### Setup Automático (Recomendado)

#### Windows
```bash
# Clonar repositorio
git clone https://github.com/yourusername/toothpick.git
cd toothpick

# Ejecutar setup automático
.\scripts\setup.bat
```

#### macOS/Linux
```bash
# Clonar repositorio
git clone https://github.com/yourusername/toothpick.git
cd toothpick

# Dar permisos de ejecución
chmod +x scripts/setup.sh

# Ejecutar setup automático
./scripts/setup.sh
```

### Setup Manual

#### 1. Configurar Variables de Entorno
```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones
```

#### 2. Levantar Infraestructura
```bash
# Iniciar servicios base (PostgreSQL, Redis)
docker-compose up -d postgres redis

# Instalar dependencias backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Instalar dependencias frontend
cd ../tooth-pick
npm install  # o pnpm install

# Instalar dependencias mobile
cd ../mobile
npm install
```

#### 3. Ejecutar Migraciones
```bash
cd backend
alembic upgrade head
```

#### 4. Iniciar Servicios de Desarrollo
```bash
# Backend (Puerto 8000)
cd backend
uvicorn main:app --reload

# Frontend (Puerto 3000)
cd tooth-pick
npm run dev

# Landing (Puerto 3001)
cd landing
npm run dev

# Mobile (Expo)
cd mobile
expo start
```

## 🐳 Deployment con Docker

### Desarrollo
```bash
docker-compose up -d
```

### Producción
```bash
# Construir imágenes
docker-compose -f docker-compose.prod.yml build

# Desplegar
docker-compose -f docker-compose.prod.yml up -d
```

## 📱 URLs de Acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Landing Page** | http://localhost:3001 | Página de marketing |
| **Dashboard** | http://localhost:3000 | Aplicación principal |
| **API Backend** | http://localhost:8000 | API REST |
| **API Docs** | http://localhost:8000/docs | Documentación Swagger |
| **Admin Panel** | http://localhost:8000/admin | Panel administrativo |
| **Grafana** | http://localhost:3002 | Monitoreo (admin/admin123) |

## 👥 Usuarios de Prueba

| Rol | Email | Password | Descripción |
|-----|-------|----------|-------------|
| **Admin** | admin@toothpick.com | admin123 | Administrador completo |
| **Dentista** | doctor@toothpick.com | doctor123 | Profesional dental |
| **Paciente** | paciente@toothpick.com | patient123 | Usuario final |
| **Proveedor** | proveedor@toothpick.com | provider123 | Marketplace B2B |

## 🧪 Testing

### Backend
```bash
cd backend
pytest -v
```

### Frontend
```bash
cd tooth-pick
npm test
```

### E2E
```bash
npm run test:e2e
```

## 📊 Monitoreo y Analytics

### Prometheus + Grafana
- **Métricas de aplicación** - Performance, errores, latencia
- **Métricas de infraestructura** - CPU, memoria, disco
- **Métricas de negocio** - Usuarios, citas, ventas

### Logging
- **Structured logging** con structlog
- **Centralizado** en Elasticsearch
- **Alertas** en Slack/Discord

### Salud del Sistema
```bash
# Health checks
curl http://localhost:8000/health
curl http://localhost:3000/api/health
curl http://localhost:3001/health
```

## 🔒 Seguridad

### Autenticación
- **JWT Tokens** - Access + Refresh tokens
- **Role-based Access** - Admin, Dentist, Patient, Provider
- **OAuth2** - Google, Facebook, Apple
- **2FA** - SMS y TOTP

### Protección de Datos
- **Cifrado** - AES-256 para datos sensibles
- **HIPAA Compliance** - Cumplimiento healthcare
- **GDPR Ready** - Protección de datos EU
- **Audit Logging** - Trazabilidad completa

### Infraestructura
- **HTTPS/TLS 1.3** - Cifrado en tránsito
- **Rate Limiting** - Protección DDoS
- **WAF** - Web Application Firewall
- **Backup Automatizado** - Respaldos diarios

## 🚀 Performance

### Optimizaciones
- **CDN** - Cloudflare para assets estáticos
- **Caching** - Redis para sesiones y consultas
- **Database Indexing** - Optimización PostgreSQL
- **Image Optimization** - Next.js Image component
- **Code Splitting** - Lazy loading componentes

### Métricas Target
- **First Contentful Paint** < 1.5s
- **Time to Interactive** < 3.0s
- **API Response Time** < 200ms
- **Uptime** > 99.9%

## 📱 Mobile App Deployment

### Android (Google Play)
```bash
cd mobile
expo build:android
# Subir APK a Google Play Console
```

### iOS (App Store)
```bash
cd mobile
expo build:ios
# Subir IPA a App Store Connect
```

### Configuración de Stores
- **Metadata** - Títulos, descripciones, screenshots
- **Compliance** - Cumplimiento médico y privacidad
- **In-App Purchases** - Suscripciones premium
- **Analytics** - Firebase Analytics

## 🤝 Contribución

### Setup de Desarrollo
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Estándares
- **Code Style** - ESLint + Prettier + Black
- **Testing** - Mínimo 80% coverage
- **Documentation** - JSDoc + docstrings
- **Commits** - Conventional Commits

## 🔧 Scripts Útiles

```bash
# Desarrollo
npm run dev              # Iniciar desarrollo
npm run build            # Construir producción
npm run test             # Ejecutar tests
npm run lint             # Linting código

# Docker
docker-compose up -d     # Iniciar contenedores
docker-compose down      # Parar contenedores
docker-compose logs -f   # Ver logs en vivo
docker-compose restart   # Reiniciar servicios

# Base de datos
alembic revision --autogenerate -m "descripción"  # Nueva migración
alembic upgrade head                               # Aplicar migraciones
psql $DATABASE_URL                                 # Conectar a PostgreSQL

# Mobile
expo start               # Iniciar desarrollo
expo build:android       # Build Android
expo build:ios          # Build iOS
expo publish            # Publicar OTA update
```

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

### Documentación
- **API Docs** - http://localhost:8000/docs
- **Frontend Docs** - [Storybook](http://localhost:6006)
- **Mobile Docs** - [Expo Docs](https://docs.expo.dev)

### Contacto
- **Email** - support@toothpick.com
- **Discord** - [Comunidad ToothPick](https://discord.gg/toothpick)
- **GitHub Issues** - [Reportar bugs](https://github.com/yourusername/toothpick/issues)

---

**🦷 ToothPick** - Transformando la atención dental con tecnología de vanguardia.

*Hecho con ❤️ por el equipo de ToothPick*
