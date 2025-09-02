from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.config import settings
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar nuevo usuario"""
    try:
        user_service = UserService(db)
        
        # Verificar si el email ya existe
        existing_user = user_service.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        
        # Crear usuario
        user = user_service.create_user(user_data)
        return UserResponse.from_orm(user)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Iniciar sesión"""
    try:
        auth_service = AuthService(db)
        
        # Autenticar usuario
        user = auth_service.authenticate_user(form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Crear tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        access_token = auth_service.create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        refresh_token = auth_service.create_refresh_token(
            data={"sub": str(user.id)}, expires_delta=refresh_token_expires
        )
        
        # Actualizar último login
        user_service = UserService(db)
        user_service.update_last_login(user.id)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_token": refresh_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Renovar token de acceso"""
    try:
        auth_service = AuthService(db)
        
        # Validar refresh token
        payload = auth_service.verify_token(refresh_token)
        user_id = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
        
        # Verificar que el usuario existe
        user_service = UserService(db)
        user = user_service.get_user(int(user_id))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )
        
        # Crear nuevos tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        new_access_token = auth_service.create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        new_refresh_token = auth_service.create_refresh_token(
            data={"sub": str(user.id)}, expires_delta=refresh_token_expires
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "refresh_token": new_refresh_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

@router.post("/logout")
async def logout():
    """Cerrar sesión (el frontend debe eliminar los tokens)"""
    return {"message": "Sesión cerrada exitosamente"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user = Depends(AuthService.get_current_user)):
    """Obtener información del usuario actual"""
    return UserResponse.from_orm(current_user)
