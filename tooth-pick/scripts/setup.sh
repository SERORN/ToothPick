#!/bin/bash

# 🦷 ToothPick Platform - Setup completo para producción
# Este script configura toda la infraestructura necesaria

echo "🦷 ======================================"
echo "🦷 ToothPick Platform Setup"
echo "🦷 ======================================"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar dependencias
check_dependencies() {
    log "Verificando dependencias..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker no está instalado. Por favor instala Docker Desktop."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose no está instalado."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        error "Node.js no está instalado. Por favor instala Node.js 18+."
        exit 1
    fi
    
    log "✅ Todas las dependencias están instaladas"
}

# Configurar variables de entorno
setup_environment() {
    log "Configurando variables de entorno..."
    
    if [ ! -f backend/.env ]; then
        log "Copiando archivo .env.example a .env"
        cp backend/.env.example backend/.env
        warn "⚠️  Por favor edita backend/.env con tus configuraciones antes de continuar"
        read -p "¿Has configurado el archivo .env? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Configura el archivo .env y ejecuta el script nuevamente"
            exit 1
        fi
    fi
    
    log "✅ Variables de entorno configuradas"
}

# Instalar dependencias del backend
setup_backend() {
    log "Configurando backend Python..."
    
    cd backend
    
    # Crear entorno virtual si no existe
    if [ ! -d "venv" ]; then
        log "Creando entorno virtual Python..."
        python -m venv venv
    fi
    
    # Activar entorno virtual
    source venv/bin/activate
    
    # Instalar dependencias
    log "Instalando dependencias Python..."
    pip install --upgrade pip
    pip install -r requirements.txt
    
    cd ..
    log "✅ Backend configurado"
}

# Instalar dependencias del frontend
setup_frontend() {
    log "Configurando frontend Next.js..."
    
    cd tooth-pick
    
    # Instalar dependencias
    if [ -f "pnpm-lock.yaml" ]; then
        log "Instalando dependencias con pnpm..."
        pnpm install
    else
        log "Instalando dependencias con npm..."
        npm install
    fi
    
    cd ..
    log "✅ Frontend configurado"
}

# Configurar base de datos
setup_database() {
    log "Configurando base de datos PostgreSQL..."
    
    # Crear directorio para scripts de DB
    mkdir -p backend/scripts
    
    # Crear script de inicialización
    cat > backend/scripts/init.sql << 'EOF'
-- Inicialización de la base de datos ToothPick
-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Crear índices para búsqueda de texto
-- Los índices específicos se crearán con las migraciones de Alembic

-- Configurar timezone
SET timezone = 'America/Mexico_City';

-- Mensaje de confirmación
SELECT 'ToothPick Database initialized successfully!' as message;
EOF

    log "✅ Base de datos configurada"
}

# Configurar mobile app
setup_mobile() {
    log "Configurando aplicación móvil..."
    
    cd mobile
    
    # Instalar dependencias
    log "Instalando dependencias móviles..."
    npm install
    
    # Verificar configuración de Expo
    if command -v expo &> /dev/null; then
        log "✅ Expo CLI encontrado"
    else
        warn "Expo CLI no encontrado. Instalando..."
        npm install -g @expo/cli
    fi
    
    cd ..
    log "✅ Aplicación móvil configurada"
}

# Construir imágenes Docker
build_images() {
    log "Construyendo imágenes Docker..."
    
    # Construir todas las imágenes
    docker-compose build --no-cache
    
    log "✅ Imágenes Docker construidas"
}

# Ejecutar migraciones de base de datos
run_migrations() {
    log "Ejecutando migraciones de base de datos..."
    
    # Esperar a que PostgreSQL esté listo
    log "Esperando a que PostgreSQL esté listo..."
    sleep 10
    
    # Ejecutar migraciones con Alembic
    docker-compose exec backend alembic upgrade head
    
    log "✅ Migraciones ejecutadas"
}

# Inicializar datos de prueba
seed_data() {
    log "Inicializando datos de prueba..."
    
    # Crear script de datos de prueba
    cat > backend/scripts/seed_data.py << 'EOF'
import asyncio
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.services.user_service import UserService

async def seed_initial_data():
    """Crear datos iniciales para la plataforma"""
    db = next(get_db())
    auth_service = AuthService()
    user_service = UserService(db)
    
    # Crear usuario administrador
    admin_data = {
        "email": "admin@toothpick.com",
        "password": "admin123",
        "full_name": "Administrador ToothPick",
        "phone": "+52 55 1234 5678",
        "role": UserRole.ADMIN
    }
    
    admin_user = user_service.create_user(admin_data)
    print(f"Admin user created: {admin_user.email}")
    
    # Crear dentista de prueba
    dentist_data = {
        "email": "doctor@toothpick.com",
        "password": "doctor123",
        "full_name": "Dr. Juan Pérez",
        "phone": "+52 55 2345 6789",
        "role": UserRole.DENTIST
    }
    
    dentist_user = user_service.create_user(dentist_data)
    print(f"Dentist user created: {dentist_user.email}")
    
    # Crear paciente de prueba
    patient_data = {
        "email": "paciente@toothpick.com",
        "password": "patient123",
        "full_name": "María González",
        "phone": "+52 55 3456 7890",
        "role": UserRole.PATIENT
    }
    
    patient_user = user_service.create_user(patient_data)
    print(f"Patient user created: {patient_user.email}")
    
    # Crear proveedor de prueba
    provider_data = {
        "email": "proveedor@toothpick.com",
        "password": "provider123",
        "full_name": "Dental Supply Inc.",
        "phone": "+52 55 4567 8901",
        "role": UserRole.PROVIDER
    }
    
    provider_user = user_service.create_user(provider_data)
    print(f"Provider user created: {provider_user.email}")
    
    db.close()
    print("✅ Datos iniciales creados exitosamente")

if __name__ == "__main__":
    asyncio.run(seed_initial_data())
EOF

    # Ejecutar script de datos
    docker-compose exec backend python scripts/seed_data.py
    
    log "✅ Datos de prueba inicializados"
}

# Verificar que todo funcione
verify_deployment() {
    log "Verificando deployment..."
    
    # Verificar servicios
    log "Verificando servicios..."
    sleep 5
    
    # Backend
    if curl -f http://localhost:8000/health; then
        log "✅ Backend funcionando correctamente"
    else
        error "❌ Backend no responde"
    fi
    
    # Frontend
    if curl -f http://localhost:3000; then
        log "✅ Frontend funcionando correctamente"
    else
        error "❌ Frontend no responde"
    fi
    
    # Landing
    if curl -f http://localhost:3001; then
        log "✅ Landing page funcionando correctamente"
    else
        error "❌ Landing page no responde"
    fi
    
    log "🎉 ¡ToothPick Platform está funcionando!"
}

# Mostrar información final
show_final_info() {
    echo
    echo "🦷 ======================================"
    echo "🦷 ToothPick Platform - Setup Completo"
    echo "🦷 ======================================"
    echo
    echo "📱 URLs de acceso:"
    echo "   Landing Page:  http://localhost:3001"
    echo "   Dashboard:     http://localhost:3000"
    echo "   API:           http://localhost:8000"
    echo "   API Docs:      http://localhost:8000/docs"
    echo "   Grafana:       http://localhost:3002 (admin/admin123)"
    echo
    echo "👥 Usuarios de prueba:"
    echo "   Admin:         admin@toothpick.com / admin123"
    echo "   Dentista:      doctor@toothpick.com / doctor123"
    echo "   Paciente:      paciente@toothpick.com / patient123"
    echo "   Proveedor:     proveedor@toothpick.com / provider123"
    echo
    echo "🔧 Comandos útiles:"
    echo "   Ver logs:      docker-compose logs -f"
    echo "   Parar:         docker-compose down"
    echo "   Reiniciar:     docker-compose restart"
    echo "   Reconstruir:   docker-compose build --no-cache"
    echo
    echo "🚀 ¡La plataforma está lista para usar!"
}

# Función principal
main() {
    log "Iniciando setup de ToothPick Platform..."
    
    check_dependencies
    setup_environment
    setup_backend
    setup_frontend
    setup_mobile
    setup_database
    
    log "Iniciando servicios con Docker Compose..."
    docker-compose up -d
    
    build_images
    run_migrations
    seed_data
    verify_deployment
    show_final_info
}

# Ejecutar script principal
main "$@"
