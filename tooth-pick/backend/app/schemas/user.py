from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, UserStatus

# Esquemas base
class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole
    clinic_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "México"

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    clinic_name: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    specialties: Optional[str] = None

class UserResponse(UserBase):
    id: int
    status: UserStatus
    is_active: bool
    is_verified: bool
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None

# Esquemas para perfil público (información limitada)
class UserPublic(BaseModel):
    id: int
    first_name: str
    last_name: str
    clinic_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    profile_picture: Optional[str] = None
    specialties: Optional[str] = None
    is_verified: bool
    
    class Config:
        from_attributes = True

# Lista de usuarios (para admin)
class UserList(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int
