from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date, timedelta
from ..database import get_db
from ..models.appointment import Appointment, AppointmentStatus, AppointmentType
from ..models.user import User, UserRole
from ..services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/")
async def get_appointments(
    dentist_id: int = None,
    patient_id: int = None,
    start_date: str = None,
    end_date: str = None,
    status: str = None,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """Obtener citas con filtros"""
    query = db.query(Appointment)
    
    if dentist_id:
        query = query.filter(Appointment.dentist_id == dentist_id)
    
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    
    if start_date:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        query = query.filter(Appointment.appointment_date >= start)
    
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        query = query.filter(Appointment.appointment_date <= end)
    
    if status:
        try:
            status_enum = AppointmentStatus(status)
            query = query.filter(Appointment.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estado de cita inválido"
            )
    
    appointments = query.order_by(
        Appointment.appointment_date, 
        Appointment.start_time
    ).limit(limit).all()
    
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "dentist_id": a.dentist_id,
            "appointment_date": a.appointment_date.isoformat(),
            "start_time": a.start_time.strftime("%H:%M"),
            "end_time": a.end_time.strftime("%H:%M"),
            "appointment_type": a.appointment_type.value,
            "status": a.status.value,
            "notes": a.notes,
            "treatment_description": a.treatment_description,
            "estimated_cost": float(a.estimated_cost) if a.estimated_cost else None,
            "created_at": a.created_at.isoformat()
        } for a in appointments
    ]

@router.post("/")
async def create_appointment(
    appointment_data: dict,
    db: Session = Depends(get_db)
):
    """Crear nueva cita"""
    appointment_service = AppointmentService(db)
    
    try:
        # Convertir strings a objetos datetime/date
        if "appointment_date" in appointment_data:
            appointment_data["appointment_date"] = datetime.strptime(
                appointment_data["appointment_date"], "%Y-%m-%d"
            ).date()
        
        if "start_time" in appointment_data:
            appointment_data["start_time"] = datetime.strptime(
                appointment_data["start_time"], "%H:%M"
            ).time()
        
        if "end_time" in appointment_data:
            appointment_data["end_time"] = datetime.strptime(
                appointment_data["end_time"], "%H:%M"
            ).time()
        
        appointment = appointment_service.create_appointment(appointment_data)
        
        return {
            "id": appointment.id,
            "patient_id": appointment.patient_id,
            "dentist_id": appointment.dentist_id,
            "appointment_date": appointment.appointment_date.isoformat(),
            "start_time": appointment.start_time.strftime("%H:%M"),
            "end_time": appointment.end_time.strftime("%H:%M"),
            "status": appointment.status.value,
            "message": "Cita creada exitosamente"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando cita: {str(e)}"
        )

@router.get("/{appointment_id}")
async def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    """Obtener cita por ID"""
    appointment_service = AppointmentService(db)
    appointment = appointment_service.get_appointment_by_id(appointment_id)
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    
    return {
        "id": appointment.id,
        "patient_id": appointment.patient_id,
        "dentist_id": appointment.dentist_id,
        "appointment_date": appointment.appointment_date.isoformat(),
        "start_time": appointment.start_time.strftime("%H:%M"),
        "end_time": appointment.end_time.strftime("%H:%M"),
        "appointment_type": appointment.appointment_type.value,
        "status": appointment.status.value,
        "notes": appointment.notes,
        "treatment_description": appointment.treatment_description,
        "estimated_cost": float(appointment.estimated_cost) if appointment.estimated_cost else None,
        "actual_start_time": appointment.actual_start_time.strftime("%H:%M") if appointment.actual_start_time else None,
        "actual_end_time": appointment.actual_end_time.strftime("%H:%M") if appointment.actual_end_time else None,
        "cancellation_reason": appointment.cancellation_reason,
        "created_at": appointment.created_at.isoformat()
    }

@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: int,
    status_data: dict,
    db: Session = Depends(get_db)
):
    """Actualizar estado de cita"""
    appointment_service = AppointmentService(db)
    
    try:
        new_status = AppointmentStatus(status_data["status"])
        notes = status_data.get("notes")
        
        appointment = appointment_service.update_appointment_status(
            appointment_id, new_status, notes
        )
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cita no encontrada"
            )
        
        return {
            "id": appointment.id,
            "status": appointment.status.value,
            "message": "Estado actualizado exitosamente"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{appointment_id}/reschedule")
async def reschedule_appointment(
    appointment_id: int,
    reschedule_data: dict,
    db: Session = Depends(get_db)
):
    """Reprogramar cita"""
    appointment_service = AppointmentService(db)
    
    try:
        new_date = datetime.strptime(reschedule_data["appointment_date"], "%Y-%m-%d").date()
        new_start_time = datetime.strptime(reschedule_data["start_time"], "%H:%M").time()
        new_end_time = datetime.strptime(reschedule_data["end_time"], "%H:%M").time()
        
        appointment = appointment_service.reschedule_appointment(
            appointment_id, new_date, new_start_time, new_end_time
        )
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cita no encontrada"
            )
        
        return {
            "id": appointment.id,
            "appointment_date": appointment.appointment_date.isoformat(),
            "start_time": appointment.start_time.strftime("%H:%M"),
            "end_time": appointment.end_time.strftime("%H:%M"),
            "message": "Cita reprogramada exitosamente"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: int,
    cancellation_data: dict,
    db: Session = Depends(get_db)
):
    """Cancelar cita"""
    appointment_service = AppointmentService(db)
    
    reason = cancellation_data.get("reason", "Sin razón especificada")
    cancelled_by = cancellation_data.get("cancelled_by", 1)  # Por ahora hardcoded
    
    success = appointment_service.cancel_appointment(appointment_id, reason, cancelled_by)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    
    return {"message": "Cita cancelada exitosamente"}

@router.get("/dentist/{dentist_id}/today")
async def get_today_appointments(dentist_id: int, db: Session = Depends(get_db)):
    """Obtener citas de hoy para un dentista"""
    appointment_service = AppointmentService(db)
    appointments = appointment_service.get_today_appointments(dentist_id)
    
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "start_time": a.start_time.strftime("%H:%M"),
            "end_time": a.end_time.strftime("%H:%M"),
            "appointment_type": a.appointment_type.value,
            "status": a.status.value,
            "treatment_description": a.treatment_description
        } for a in appointments
    ]

@router.get("/dentist/{dentist_id}/upcoming")
async def get_upcoming_appointments(
    dentist_id: int,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    """Obtener próximas citas de un dentista"""
    appointment_service = AppointmentService(db)
    appointments = appointment_service.get_upcoming_appointments(
        dentist_id, UserRole.DENTIST, days
    )
    
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "appointment_date": a.appointment_date.isoformat(),
            "start_time": a.start_time.strftime("%H:%M"),
            "appointment_type": a.appointment_type.value,
            "status": a.status.value
        } for a in appointments
    ]

@router.get("/patient/{patient_id}/history")
async def get_patient_appointments(
    patient_id: int,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """Obtener historial de citas de un paciente"""
    appointment_service = AppointmentService(db)
    appointments = appointment_service.get_appointments_by_patient(patient_id, limit)
    
    return [
        {
            "id": a.id,
            "dentist_id": a.dentist_id,
            "appointment_date": a.appointment_date.isoformat(),
            "start_time": a.start_time.strftime("%H:%M"),
            "appointment_type": a.appointment_type.value,
            "status": a.status.value,
            "treatment_description": a.treatment_description,
            "estimated_cost": float(a.estimated_cost) if a.estimated_cost else None
        } for a in appointments
    ]

@router.get("/dentist/{dentist_id}/available-slots")
async def get_available_slots(
    dentist_id: int,
    date: str,
    duration: int = Query(60, ge=30, le=180),
    db: Session = Depends(get_db)
):
    """Obtener horarios disponibles para un dentista"""
    appointment_service = AppointmentService(db)
    
    try:
        appointment_date = datetime.strptime(date, "%Y-%m-%d").date()
        slots = appointment_service.get_available_slots(dentist_id, appointment_date, duration)
        
        return {
            "date": date,
            "dentist_id": dentist_id,
            "available_slots": slots
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Usar YYYY-MM-DD"
        )

@router.get("/dentist/{dentist_id}/statistics")
async def get_appointment_statistics(
    dentist_id: int,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """Obtener estadísticas de citas"""
    appointment_service = AppointmentService(db)
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        stats = appointment_service.get_appointment_statistics(dentist_id, start, end)
        
        return {
            "period": f"{start_date} to {end_date}",
            "dentist_id": dentist_id,
            **stats
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Usar YYYY-MM-DD"
        )
