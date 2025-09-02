# 🦷 ToothPick Backend - FastAPI + PostgreSQL

## 🏗️ Backend Architecture

Este es el backend de la plataforma ToothPick, desarrollado con FastAPI y PostgreSQL para máximo rendimiento y escalabilidad.

### 🔧 Stack Tecnológico

- **FastAPI** - Framework web moderno para APIs
- **PostgreSQL** - Base de datos relacional robusta
- **SQLAlchemy** - ORM para Python
- **Pydantic** - Validación de datos
- **Alembic** - Migraciones de base de datos
- **Redis** - Cache y sesiones
- **Celery** - Tareas asíncronas
- **JWT** - Autenticación segura

### 📁 Estructura

```
backend/
├── app/
│   ├── api/           # Endpoints de la API
│   ├── core/          # Configuración central
│   ├── models/        # Modelos SQLAlchemy
│   ├── schemas/       # Esquemas Pydantic
│   ├── services/      # Lógica de negocio
│   └── utils/         # Utilidades
├── alembic/           # Migraciones
├── requirements.txt   # Dependencias
└── main.py           # Punto de entrada
```

### 🚀 Quick Start

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 🔗 Endpoints Principales

- `/api/v1/auth` - Autenticación
- `/api/v1/users` - Gestión de usuarios
- `/api/v1/products` - Catálogo de productos
- `/api/v1/appointments` - Sistema de citas
- `/api/v1/payments` - Procesamiento de pagos
- `/api/v1/analytics` - Analytics y reportes

### 📊 Base de Datos

PostgreSQL con las siguientes tablas principales:
- `users` - Usuarios (dentistas, pacientes, distribuidores)
- `products` - Catálogo de productos dentales
- `appointments` - Sistema de citas
- `orders` - Órdenes y transacciones
- `clinics` - Información de clínicas
- `subscriptions` - Planes de suscripción

### 🔐 Autenticación

JWT tokens con refresh tokens para seguridad máxima.

### 📈 Monitoreo

- Health checks en `/health`
- Métricas en `/metrics`
- Logs estructurados
