# 📱 ToothPick Mobile - React Native

## 🦷 Aplicación Móvil de ToothPick

Aplicación móvil multiplataforma para la plataforma dental ToothPick, construida con React Native y Expo.

### 🚀 Características

- **Multiplataforma**: iOS y Android desde un solo código
- **Expo**: Framework para desarrollo rápido
- **TypeScript**: Tipado estático completo
- **Navigation**: Stack y Tab navigation nativa
- **State Management**: Redux Toolkit
- **API Integration**: Integración completa con backend FastAPI
- **Push Notifications**: Notificaciones push nativas
- **Offline Support**: Funcionamiento offline básico

### 📁 Estructura

```
mobile/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── screens/        # Pantallas de la app
│   ├── navigation/     # Configuración de navegación
│   ├── services/       # Servicios de API
│   ├── store/          # Estado global (Redux)
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilidades
├── assets/             # Imágenes e iconos
├── app.json           # Configuración Expo
├── package.json       # Dependencias
└── tsconfig.json      # Configuración TypeScript
```

### 🎯 Funcionalidades Principales

#### Para Pacientes:
- 📅 **Agendar Citas**: Sistema completo de reservas
- 👨‍⚕️ **Buscar Dentistas**: Filtrado por ubicación y especialidad
- 📋 **Historial Médico**: Registro de tratamientos
- 💳 **Pagos**: Integración con métodos de pago
- 📱 **Notificaciones**: Recordatorios y actualizaciones

#### Para Dentistas:
- 📊 **Dashboard**: Métricas y analíticas
- 📅 **Gestión de Agenda**: Manejo de citas
- 👥 **Pacientes**: Base de datos de pacientes
- 💰 **Facturación**: Sistema de cobros
- 📈 **Reportes**: Analytics en tiempo real

### 🛠️ Tecnologías

- **React Native** 0.73+
- **Expo** SDK 50+
- **TypeScript** 5.0+
- **React Navigation** 6.x
- **Redux Toolkit** + RTK Query
- **Expo Router** (File-based routing)
- **React Hook Form** (Formularios)
- **Async Storage** (Almacenamiento local)

### 📦 Instalación y Desarrollo

```bash
# Instalar Expo CLI
npm install -g @expo/cli

# Instalar dependencias
cd mobile
npm install

# Iniciar desarrollo
expo start

# Para iOS
expo start --ios

# Para Android
expo start --android
```

### 🔧 Configuración

1. **Variables de Entorno**: Configurar en `.env`
2. **API Base URL**: Endpoint del backend FastAPI
3. **Push Notifications**: Configuración de Expo Notifications
4. **Deep Linking**: Para navegación desde notificaciones

### 📱 Build y Deploy

```bash
# Build para desarrollo
expo build:android
expo build:ios

# Build para producción
eas build --platform android
eas build --platform ios

# Submit a stores
eas submit --platform android
eas submit --platform ios
```

### 🎨 Design System

- **Colores**: Paleta consistente con web
- **Tipografía**: Sistema escalable
- **Componentes**: Biblioteca reutilizable
- **Iconos**: Expo Vector Icons + Lucide
- **Responsive**: Adaptable a todos los tamaños

### 🔐 Autenticación

- JWT tokens sincronizados con backend
- Biometric authentication (huella/face)
- Auto-refresh de tokens
- Logout automático por seguridad

### 📊 Analytics

- Integración con analytics backend
- Eventos de usuario trackeados
- Métricas de performance
- Crash reporting

### 🚀 Roadmap

- [ ] **v1.0**: Funcionalidades básicas
- [ ] **v1.1**: Push notifications
- [ ] **v1.2**: Offline support
- [ ] **v1.3**: Pagos in-app
- [ ] **v2.0**: AR/VR features
