from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .user import Base

class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class AppointmentType(str, enum.Enum):
    CONSULTATION = "consultation"
    CLEANING = "cleaning"
    PROCEDURE = "procedure"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"
    ORTHODONTICS = "orthodontics"
    SURGERY = "surgery"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    REFUNDED = "refunded"
    FAILED = "failed"

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Participantes
    dentist_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Información de la cita
    title = Column(String(200), nullable=False)
    description = Column(Text)
    type = Column(Enum(AppointmentType), nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    
    # Fecha y hora
    scheduled_date = Column(DateTime(timezone=True), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Ubicación
    location = Column(String(300))
    room_number = Column(String(50))
    clinic_address = Column(Text)
    
    # Información médica
    chief_complaint = Column(Text)
    diagnosis = Column(Text)
    treatment_plan = Column(Text)
    notes = Column(Text)
    allergies = Column(Text)
    medications = Column(Text)
    
    # Financiero
    estimated_cost = Column(Numeric(10, 2))
    actual_cost = Column(Numeric(10, 2))
    insurance_covered = Column(Numeric(10, 2))
    patient_payment = Column(Numeric(10, 2))
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Seguimiento
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(DateTime(timezone=True))
    follow_up_notes = Column(Text)
    
    # Recordatorios
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime(timezone=True))
    confirmation_required = Column(Boolean, default=True)
    confirmed_at = Column(DateTime(timezone=True))
    
    # Cancelación
    cancelled_by = Column(String(50))  # "patient", "dentist", "system"
    cancellation_reason = Column(Text)
    cancelled_at = Column(DateTime(timezone=True))
    
    # Archivos adjuntos
    attachments = Column(Text)  # JSON array de URLs
    x_rays = Column(Text)  # JSON array de URLs de radiografías
    photos = Column(Text)  # JSON array de fotos del tratamiento
    
    # Metadata
    is_emergency = Column(Boolean, default=False)
    is_first_visit = Column(Boolean, default=False)
    requires_anesthesia = Column(Boolean, default=False)
    estimated_difficulty = Column(String(20))  # "low", "medium", "high"
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relaciones
    dentist = relationship("User", foreign_keys=[dentist_id], back_populates="appointments_as_dentist")
    patient = relationship("User", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    
    def __repr__(self):
        return f"<Appointment(id={self.id}, patient_id={self.patient_id}, date='{self.scheduled_date}')>"
