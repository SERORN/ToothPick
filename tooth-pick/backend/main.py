from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import sys
import os

# Agregar el directorio app al path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.config import settings
from app.database import engine, Base, SessionLocal
from app.api import auth, users, products, appointments, analytics, subscriptions, payments

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ToothPick API",
    description="API Backend para la plataforma dental ToothPick",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas de API
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(appointments.router)
app.include_router(analytics.router)
app.include_router(subscriptions.router)
app.include_router(payments.router)

@app.get("/")
async def root():
    return {"message": "🦷 ToothPick API - Plataforma Dental Profesional"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "toothpick-api",
        "version": "1.0.0"
    }

# Inicializar datos de suscripciones
@app.on_event("startup")
async def startup_event():
    """Inicializar datos al arrancar la aplicación"""
    from app.core.seed_plans import seed_subscription_plans
    
    db = SessionLocal()
    try:
        seed_subscription_plans(db)
    except Exception as e:
        print(f"Error inicializando planes: {e}")
    finally:
        db.close()

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status": "error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"]
    )
