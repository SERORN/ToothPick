from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from app.models.user import User, UserStatus
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import AuthService

class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.auth_service = AuthService(db)
    
    def create_user(self, user_data: UserCreate) -> User:
        """Crear nuevo usuario"""
        # Hash de la contraseña
        hashed_password = self.auth_service.get_password_hash(user_data.password)
        
        # Crear objeto usuario
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            role=user_data.role,
            clinic_name=user_data.clinic_name,
            city=user_data.city,
            state=user_data.state,
            country=user_data.country,
            status=UserStatus.ACTIVE
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def get_user(self, user_id: int) -> Optional[User]:
        """Obtener usuario por ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Obtener usuario por email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Obtener usuario por username"""
        return self.db.query(User).filter(User.username == username).first()
    
    def get_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Obtener lista de usuarios"""
        return self.db.query(User).offset(skip).limit(limit).all()
    
    def update_user(self, user_id: int, user_data: UserUpdate) -> Optional[User]:
        """Actualizar usuario"""
        user = self.get_user(user_id)
        if not user:
            return None
        
        # Actualizar solo los campos proporcionados
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def delete_user(self, user_id: int) -> bool:
        """Eliminar usuario (soft delete)"""
        user = self.get_user(user_id)
        if not user:
            return False
        
        user.is_active = False
        user.status = UserStatus.INACTIVE
        user.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    def update_last_login(self, user_id: int):
        """Actualizar último login"""
        user = self.get_user(user_id)
        if user:
            user.last_login = datetime.utcnow()
            self.db.commit()
    
    def verify_user(self, user_id: int) -> bool:
        """Verificar cuenta de usuario"""
        user = self.get_user(user_id)
        if not user:
            return False
        
        user.is_verified = True
        user.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    def search_users(self, query: str, skip: int = 0, limit: int = 50) -> List[User]:
        """Buscar usuarios por nombre, email o clínica"""
        return self.db.query(User).filter(
            (User.first_name.ilike(f"%{query}%")) |
            (User.last_name.ilike(f"%{query}%")) |
            (User.email.ilike(f"%{query}%")) |
            (User.clinic_name.ilike(f"%{query}%"))
        ).offset(skip).limit(limit).all()
    
    def get_dentists(self, city: Optional[str] = None, state: Optional[str] = None, 
                    skip: int = 0, limit: int = 50) -> List[User]:
        """Obtener lista de dentistas"""
        query = self.db.query(User).filter(
            User.role == "dentist",
            User.is_active == True,
            User.is_verified == True
        )
        
        if city:
            query = query.filter(User.city.ilike(f"%{city}%"))
        if state:
            query = query.filter(User.state.ilike(f"%{state}%"))
        
        return query.offset(skip).limit(limit).all()
    
    def get_user_stats(self, user_id: int) -> dict:
        """Obtener estadísticas del usuario"""
        user = self.get_user(user_id)
        if not user:
            return {}
        
        # Aquí puedes agregar consultas específicas según el rol
        if user.role == "dentist":
            # Estadísticas para dentistas
            return {
                "total_appointments": 0,  # Implementar consulta
                "total_patients": 0,      # Implementar consulta
                "total_revenue": 0        # Implementar consulta
            }
        
        return {"user_type": user.role.value}
