from typing import List, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from ..models.appointment import Appointment, AppointmentStatus, AppointmentType
from ..models.user import User, UserRole
from ..database import get_db
import logging

logger = logging.getLogger(__name__)

class AppointmentService:
    """
    Servicio para gestión de citas dentales
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_appointment(self, appointment_data: dict) -> Appointment:
        """Crear nueva cita"""
        try:
            # Validar que el dentista existe y tiene el rol correcto
            dentist = self.db.query(User).filter(
                and_(
                    User.id == appointment_data["dentist_id"],
                    User.role == UserRole.DENTIST,
                    User.is_active == True
                )
            ).first()
            
            if not dentist:
                raise ValueError("Dentista no encontrado o inactivo")
            
            # Validar que el paciente existe
            patient = self.db.query(User).filter(
                and_(
                    User.id == appointment_data["patient_id"],
                    User.role == UserRole.PATIENT,
                    User.is_active == True
                )
            ).first()
            
            if not patient:
                raise ValueError("Paciente no encontrado o inactivo")
            
            # Verificar disponibilidad del dentista
            if not self._is_time_available(
                appointment_data["dentist_id"],
                appointment_data["appointment_date"],
                appointment_data["start_time"],
                appointment_data["end_time"]
            ):
                raise ValueError("Horario no disponible")
            
            appointment = Appointment(
                patient_id=appointment_data["patient_id"],
                dentist_id=appointment_data["dentist_id"],
                appointment_date=appointment_data["appointment_date"],
                start_time=appointment_data["start_time"],
                end_time=appointment_data["end_time"],
                appointment_type=AppointmentType(appointment_data["appointment_type"]),
                notes=appointment_data.get("notes", ""),
                treatment_description=appointment_data.get("treatment_description", ""),
                estimated_cost=appointment_data.get("estimated_cost"),
                status=AppointmentStatus.SCHEDULED
            )
            
            self.db.add(appointment)
            self.db.commit()
            self.db.refresh(appointment)
            
            logger.info(f"Cita creada: {appointment.id} para {patient.full_name} con Dr. {dentist.full_name}")
            return appointment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creando cita: {str(e)}")
            raise
    
    def get_appointment_by_id(self, appointment_id: int) -> Optional[Appointment]:
        """Obtener cita por ID"""
        return self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    def get_appointments_by_dentist(self, dentist_id: int, start_date: date, end_date: date) -> List[Appointment]:
        """Obtener citas de un dentista en un rango de fechas"""
        return self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date
            )
        ).order_by(Appointment.appointment_date, Appointment.start_time).all()
    
    def get_appointments_by_patient(self, patient_id: int, limit: int = 50) -> List[Appointment]:
        """Obtener historial de citas de un paciente"""
        return self.db.query(Appointment).filter(
            Appointment.patient_id == patient_id
        ).order_by(Appointment.appointment_date.desc()).limit(limit).all()
    
    def get_today_appointments(self, dentist_id: int) -> List[Appointment]:
        """Obtener citas de hoy para un dentista"""
        today = date.today()
        return self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date == today,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS])
            )
        ).order_by(Appointment.start_time).all()
    
    def get_upcoming_appointments(self, user_id: int, user_role: UserRole, days: int = 7) -> List[Appointment]:
        """Obtener próximas citas"""
        end_date = date.today() + timedelta(days=days)
        
        if user_role == UserRole.DENTIST:
            filter_condition = Appointment.dentist_id == user_id
        elif user_role == UserRole.PATIENT:
            filter_condition = Appointment.patient_id == user_id
        else:
            return []
        
        return self.db.query(Appointment).filter(
            and_(
                filter_condition,
                Appointment.appointment_date >= date.today(),
                Appointment.appointment_date <= end_date,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
            )
        ).order_by(Appointment.appointment_date, Appointment.start_time).all()
    
    def update_appointment_status(self, appointment_id: int, new_status: AppointmentStatus, notes: str = None) -> Optional[Appointment]:
        """Actualizar estado de cita"""
        try:
            appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
            
            if not appointment:
                return None
            
            appointment.status = new_status
            
            if notes:
                appointment.notes = f"{appointment.notes}\n{datetime.now().strftime('%Y-%m-%d %H:%M')}: {notes}"
            
            # Actualizar campos específicos según el estado
            if new_status == AppointmentStatus.IN_PROGRESS:
                appointment.actual_start_time = datetime.now().time()
            elif new_status == AppointmentStatus.COMPLETED:
                appointment.actual_end_time = datetime.now().time()
            elif new_status == AppointmentStatus.CANCELLED:
                appointment.cancellation_reason = notes
                appointment.cancelled_at = datetime.now()
            
            self.db.commit()
            self.db.refresh(appointment)
            
            logger.info(f"Estado de cita {appointment_id} actualizado a {new_status.value}")
            return appointment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error actualizando estado de cita: {str(e)}")
            raise
    
    def reschedule_appointment(self, appointment_id: int, new_date: date, new_start_time: datetime, new_end_time: datetime) -> Optional[Appointment]:
        """Reprogramar cita"""
        try:
            appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
            
            if not appointment:
                return None
            
            # Verificar disponibilidad en el nuevo horario
            if not self._is_time_available(
                appointment.dentist_id,
                new_date,
                new_start_time,
                new_end_time,
                exclude_appointment_id=appointment_id
            ):
                raise ValueError("Nuevo horario no disponible")
            
            appointment.appointment_date = new_date
            appointment.start_time = new_start_time
            appointment.end_time = new_end_time
            appointment.status = AppointmentStatus.RESCHEDULED
            
            self.db.commit()
            self.db.refresh(appointment)
            
            logger.info(f"Cita {appointment_id} reprogramada para {new_date} {new_start_time}")
            return appointment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error reprogramando cita: {str(e)}")
            raise
    
    def cancel_appointment(self, appointment_id: int, reason: str, cancelled_by: int) -> bool:
        """Cancelar cita"""
        try:
            appointment = self.db.query(Appointment).filter(Appointment.id == appointment_id).first()
            
            if not appointment:
                return False
            
            appointment.status = AppointmentStatus.CANCELLED
            appointment.cancellation_reason = reason
            appointment.cancelled_at = datetime.now()
            appointment.cancelled_by = cancelled_by
            
            self.db.commit()
            
            logger.info(f"Cita {appointment_id} cancelada: {reason}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelando cita: {str(e)}")
            return False
    
    def get_available_slots(self, dentist_id: int, date: date, duration_minutes: int = 60) -> List[dict]:
        """Obtener horarios disponibles para un dentista en una fecha"""
        # Obtener citas existentes del día
        existing_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date == date,
                Appointment.status.in_([
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.IN_PROGRESS
                ])
            )
        ).order_by(Appointment.start_time).all()
        
        # Horarios de trabajo típicos (8:00 AM - 6:00 PM)
        work_start = datetime.strptime("08:00", "%H:%M").time()
        work_end = datetime.strptime("18:00", "%H:%M").time()
        
        available_slots = []
        current_time = datetime.combine(date, work_start)
        end_of_day = datetime.combine(date, work_end)
        
        for appointment in existing_appointments:
            appointment_start = datetime.combine(date, appointment.start_time)
            
            # Agregar slots disponibles antes de la cita
            while current_time + timedelta(minutes=duration_minutes) <= appointment_start:
                available_slots.append({
                    "start_time": current_time.time(),
                    "end_time": (current_time + timedelta(minutes=duration_minutes)).time()
                })
                current_time += timedelta(minutes=30)  # Slots cada 30 minutos
            
            # Saltar al final de la cita actual
            current_time = datetime.combine(date, appointment.end_time)
        
        # Agregar slots restantes hasta el final del día
        while current_time + timedelta(minutes=duration_minutes) <= end_of_day:
            available_slots.append({
                "start_time": current_time.time(),
                "end_time": (current_time + timedelta(minutes=duration_minutes)).time()
            })
            current_time += timedelta(minutes=30)
        
        return available_slots
    
    def get_appointment_statistics(self, dentist_id: int, start_date: date, end_date: date) -> dict:
        """Obtener estadísticas de citas"""
        total_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date
            )
        ).scalar()
        
        completed_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        ).scalar()
        
        cancelled_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == AppointmentStatus.CANCELLED
            )
        ).scalar()
        
        total_revenue = self.db.query(func.sum(Appointment.estimated_cost)).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        ).scalar() or 0
        
        return {
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "cancelled_appointments": cancelled_appointments,
            "no_show_appointments": total_appointments - completed_appointments - cancelled_appointments,
            "completion_rate": (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0,
            "total_revenue": float(total_revenue)
        }
    
    def _is_time_available(self, dentist_id: int, date: date, start_time: datetime, end_time: datetime, exclude_appointment_id: int = None) -> bool:
        """Verificar si un horario está disponible"""
        query = self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date == date,
                Appointment.status.in_([
                    AppointmentStatus.SCHEDULED,
                    AppointmentStatus.CONFIRMED,
                    AppointmentStatus.IN_PROGRESS
                ]),
                or_(
                    and_(Appointment.start_time <= start_time, Appointment.end_time > start_time),
                    and_(Appointment.start_time < end_time, Appointment.end_time >= end_time),
                    and_(Appointment.start_time >= start_time, Appointment.end_time <= end_time)
                )
            )
        )
        
        if exclude_appointment_id:
            query = query.filter(Appointment.id != exclude_appointment_id)
        
        conflicting_appointment = query.first()
        return conflicting_appointment is None
