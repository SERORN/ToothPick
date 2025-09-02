from fastapi import APIRouter
from .endpoints import auth, users, products, appointments, analytics

api_router = APIRouter()

# Incluir todas las rutas
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
