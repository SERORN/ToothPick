@echo off
REM 🦷 ToothPick Platform - Setup completo para Windows
REM Este script configura toda la infraestructura necesaria

echo 🦷 ======================================
echo 🦷 ToothPick Platform Setup - Windows
echo 🦷 ======================================

REM Verificar dependencias
echo [INFO] Verificando dependencias...

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker no está instalado. Por favor instala Docker Desktop.
    pause
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no está instalado. Por favor instala Node.js 18+.
    pause
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python no está instalado. Por favor instala Python 3.11+.
    pause
    exit /b 1
)

echo [INFO] ✅ Todas las dependencias están instaladas

REM Configurar variables de entorno
echo [INFO] Configurando variables de entorno...

if not exist backend\.env (
    echo [INFO] Copiando archivo .env.example a .env
    copy backend\.env.example backend\.env
    echo [WARN] ⚠️  Por favor edita backend\.env con tus configuraciones antes de continuar
    pause
)

REM Instalar dependencias del backend
echo [INFO] Configurando backend Python...
cd backend

if not exist venv (
    echo [INFO] Creando entorno virtual Python...
    python -m venv venv
)

echo [INFO] Activando entorno virtual y instalando dependencias...
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

cd ..
echo [INFO] ✅ Backend configurado

REM Instalar dependencias del frontend
echo [INFO] Configurando frontend Next.js...
cd tooth-pick

if exist pnpm-lock.yaml (
    echo [INFO] Instalando dependencias con pnpm...
    pnpm install
) else (
    echo [INFO] Instalando dependencias con npm...
    npm install
)

cd ..
echo [INFO] ✅ Frontend configurado

REM Configurar mobile app
echo [INFO] Configurando aplicación móvil...
cd mobile

echo [INFO] Instalando dependencias móviles...
npm install

where expo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Expo CLI no encontrado. Instalando...
    npm install -g @expo/cli
)

cd ..
echo [INFO] ✅ Aplicación móvil configurada

REM Configurar base de datos
echo [INFO] Configurando base de datos PostgreSQL...

if not exist backend\scripts mkdir backend\scripts

echo -- Inicialización de la base de datos ToothPick > backend\scripts\init.sql
echo -- Crear extensiones necesarias >> backend\scripts\init.sql
echo CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; >> backend\scripts\init.sql
echo CREATE EXTENSION IF NOT EXISTS "pg_trgm"; >> backend\scripts\init.sql
echo SET timezone = 'America/Mexico_City'; >> backend\scripts\init.sql
echo SELECT 'ToothPick Database initialized successfully!' as message; >> backend\scripts\init.sql

echo [INFO] ✅ Base de datos configurada

REM Iniciar servicios con Docker Compose
echo [INFO] Iniciando servicios con Docker Compose...
docker-compose up -d

echo [INFO] Construyendo imágenes Docker...
docker-compose build

echo [INFO] Esperando a que los servicios estén listos...
timeout /t 30 /nobreak >nul

echo [INFO] Ejecutando migraciones de base de datos...
docker-compose exec backend alembic upgrade head

echo [INFO] Verificando deployment...
timeout /t 5 /nobreak >nul

curl -f http://localhost:8000/health >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] ✅ Backend funcionando correctamente
) else (
    echo [ERROR] ❌ Backend no responde
)

curl -f http://localhost:3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] ✅ Frontend funcionando correctamente
) else (
    echo [ERROR] ❌ Frontend no responde
)

curl -f http://localhost:3001 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] ✅ Landing page funcionando correctamente
) else (
    echo [ERROR] ❌ Landing page no responde
)

echo.
echo 🦷 ======================================
echo 🦷 ToothPick Platform - Setup Completo
echo 🦷 ======================================
echo.
echo 📱 URLs de acceso:
echo    Landing Page:  http://localhost:3001
echo    Dashboard:     http://localhost:3000
echo    API:           http://localhost:8000
echo    API Docs:      http://localhost:8000/docs
echo    Grafana:       http://localhost:3002 (admin/admin123)
echo.
echo 👥 Usuarios de prueba:
echo    Admin:         admin@toothpick.com / admin123
echo    Dentista:      doctor@toothpick.com / doctor123
echo    Paciente:      paciente@toothpick.com / patient123
echo    Proveedor:     proveedor@toothpick.com / provider123
echo.
echo 🔧 Comandos útiles:
echo    Ver logs:      docker-compose logs -f
echo    Parar:         docker-compose down
echo    Reiniciar:     docker-compose restart
echo    Reconstruir:   docker-compose build --no-cache
echo.
echo 🚀 ¡La plataforma está lista para usar!
echo.

pause
