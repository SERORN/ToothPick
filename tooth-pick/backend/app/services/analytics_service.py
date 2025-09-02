from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text, desc
from ..models.user import User, UserRole
from ..models.appointment import Appointment, AppointmentStatus
from ..models.product import Product, ProductStatus
from ..database import get_db
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    """
    Servicio para analytics y reportes del dashboard
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard_overview(self, user_id: int, user_role: UserRole) -> Dict[str, Any]:
        """Obtener overview del dashboard según rol de usuario"""
        if user_role == UserRole.ADMIN:
            return self._get_admin_overview()
        elif user_role == UserRole.DENTIST:
            return self._get_dentist_overview(user_id)
        elif user_role == UserRole.PROVIDER:
            return self._get_provider_overview(user_id)
        elif user_role == UserRole.PATIENT:
            return self._get_patient_overview(user_id)
        else:
            return {}
    
    def _get_admin_overview(self) -> Dict[str, Any]:
        """Overview para administradores"""
        # Conteos generales
        total_users = self.db.query(func.count(User.id)).filter(User.is_active == True).scalar()
        total_dentists = self.db.query(func.count(User.id)).filter(
            and_(User.role == UserRole.DENTIST, User.is_active == True)
        ).scalar()
        total_patients = self.db.query(func.count(User.id)).filter(
            and_(User.role == UserRole.PATIENT, User.is_active == True)
        ).scalar()
        total_providers = self.db.query(func.count(User.id)).filter(
            and_(User.role == UserRole.PROVIDER, User.is_active == True)
        ).scalar()
        
        # Estadísticas de citas
        today = date.today()
        total_appointments = self.db.query(func.count(Appointment.id)).scalar()
        today_appointments = self.db.query(func.count(Appointment.id)).filter(
            Appointment.appointment_date == today
        ).scalar()
        
        # Estadísticas de productos
        total_products = self.db.query(func.count(Product.id)).filter(
            Product.status == ProductStatus.ACTIVE
        ).scalar()
        
        # Registros recientes (últimos 30 días)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        new_users_30d = self.db.query(func.count(User.id)).filter(
            User.created_at >= thirty_days_ago
        ).scalar()
        
        return {
            "total_users": total_users,
            "total_dentists": total_dentists,
            "total_patients": total_patients,
            "total_providers": total_providers,
            "total_appointments": total_appointments,
            "today_appointments": today_appointments,
            "total_products": total_products,
            "new_users_30d": new_users_30d,
            "growth_rate": self._calculate_growth_rate(),
            "revenue_metrics": self._get_revenue_metrics(),
            "appointment_trends": self._get_appointment_trends()
        }
    
    def _get_dentist_overview(self, dentist_id: int) -> Dict[str, Any]:
        """Overview para dentistas"""
        today = date.today()
        this_week_start = today - timedelta(days=today.weekday())
        this_month_start = today.replace(day=1)
        
        # Citas de hoy
        today_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date == today,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
            )
        ).order_by(Appointment.start_time).all()
        
        # Estadísticas de la semana
        week_stats = self._get_dentist_period_stats(dentist_id, this_week_start, today)
        month_stats = self._get_dentist_period_stats(dentist_id, this_month_start, today)
        
        # Próximas citas
        upcoming_appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date > today,
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
            )
        ).order_by(Appointment.appointment_date, Appointment.start_time).limit(5).all()
        
        # Pacientes totales
        total_patients = self.db.query(func.count(func.distinct(Appointment.patient_id))).filter(
            Appointment.dentist_id == dentist_id
        ).scalar()
        
        return {
            "today_appointments": len(today_appointments),
            "next_appointment": today_appointments[0] if today_appointments else None,
            "week_stats": week_stats,
            "month_stats": month_stats,
            "upcoming_appointments": upcoming_appointments[:3],
            "total_patients": total_patients,
            "performance_metrics": self._get_dentist_performance(dentist_id)
        }
    
    def _get_provider_overview(self, provider_id: int) -> Dict[str, Any]:
        """Overview para proveedores"""
        # Estadísticas de productos
        total_products = self.db.query(func.count(Product.id)).filter(
            Product.provider_id == provider_id
        ).scalar()
        
        active_products = self.db.query(func.count(Product.id)).filter(
            and_(
                Product.provider_id == provider_id,
                Product.status == ProductStatus.ACTIVE
            )
        ).scalar()
        
        low_stock_products = self.db.query(func.count(Product.id)).filter(
            and_(
                Product.provider_id == provider_id,
                Product.stock_quantity <= 10,
                Product.status == ProductStatus.ACTIVE
            )
        ).scalar()
        
        # Valor total del inventario
        total_inventory_value = self.db.query(
            func.sum(Product.price * Product.stock_quantity)
        ).filter(
            and_(
                Product.provider_id == provider_id,
                Product.status == ProductStatus.ACTIVE
            )
        ).scalar() or 0
        
        return {
            "total_products": total_products,
            "active_products": active_products,
            "low_stock_products": low_stock_products,
            "out_of_stock_products": total_products - active_products,
            "total_inventory_value": float(total_inventory_value),
            "recent_orders": [],  # TODO: Implementar cuando tengamos orders
            "sales_trends": self._get_provider_sales_trends(provider_id)
        }
    
    def _get_patient_overview(self, patient_id: int) -> Dict[str, Any]:
        """Overview para pacientes"""
        # Próxima cita
        next_appointment = self.db.query(Appointment).filter(
            and_(
                Appointment.patient_id == patient_id,
                Appointment.appointment_date >= date.today(),
                Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
            )
        ).order_by(Appointment.appointment_date, Appointment.start_time).first()
        
        # Historial de citas
        total_appointments = self.db.query(func.count(Appointment.id)).filter(
            Appointment.patient_id == patient_id
        ).scalar()
        
        completed_appointments = self.db.query(func.count(Appointment.id)).filter(
            and_(
                Appointment.patient_id == patient_id,
                Appointment.status == AppointmentStatus.COMPLETED
            )
        ).scalar()
        
        # Últimas citas
        recent_appointments = self.db.query(Appointment).filter(
            Appointment.patient_id == patient_id
        ).order_by(desc(Appointment.appointment_date)).limit(5).all()
        
        return {
            "next_appointment": next_appointment,
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "recent_appointments": recent_appointments,
            "health_summary": self._get_patient_health_summary(patient_id)
        }
    
    def _get_dentist_period_stats(self, dentist_id: int, start_date: date, end_date: date) -> Dict[str, Any]:
        """Estadísticas de un dentista para un período"""
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date
            )
        ).all()
        
        total = len(appointments)
        completed = len([a for a in appointments if a.status == AppointmentStatus.COMPLETED])
        cancelled = len([a for a in appointments if a.status == AppointmentStatus.CANCELLED])
        
        revenue = sum([a.estimated_cost or 0 for a in appointments if a.status == AppointmentStatus.COMPLETED])
        
        return {
            "total_appointments": total,
            "completed_appointments": completed,
            "cancelled_appointments": cancelled,
            "completion_rate": (completed / total * 100) if total > 0 else 0,
            "revenue": float(revenue)
        }
    
    def _get_dentist_performance(self, dentist_id: int) -> Dict[str, Any]:
        """Métricas de rendimiento del dentista"""
        # Últimos 3 meses
        three_months_ago = date.today() - timedelta(days=90)
        
        appointments = self.db.query(Appointment).filter(
            and_(
                Appointment.dentist_id == dentist_id,
                Appointment.appointment_date >= three_months_ago
            )
        ).all()
        
        if not appointments:
            return {
                "punctuality_score": 0,
                "patient_satisfaction": 0,
                "efficiency_score": 0,
                "revenue_trend": "stable"
            }
        
        # Calcular métricas (simuladas por ahora)
        total = len(appointments)
        on_time = len([a for a in appointments if a.actual_start_time and a.actual_start_time <= a.start_time])
        
        return {
            "punctuality_score": (on_time / total * 100) if total > 0 else 0,
            "patient_satisfaction": 4.2,  # TODO: Implementar con reviews
            "efficiency_score": 87.5,  # TODO: Calcular basado en tiempos reales
            "revenue_trend": "up"  # TODO: Calcular trend real
        }
    
    def _get_provider_sales_trends(self, provider_id: int) -> Dict[str, Any]:
        """Tendencias de ventas para proveedor"""
        # TODO: Implementar cuando tengamos tabla de orders
        return {
            "daily_sales": [],
            "top_products": [],
            "revenue_growth": 0
        }
    
    def _get_patient_health_summary(self, patient_id: int) -> Dict[str, Any]:
        """Resumen de salud del paciente"""
        # TODO: Implementar cuando tengamos historial médico
        return {
            "last_checkup": None,
            "upcoming_treatments": [],
            "health_alerts": []
        }
    
    def _calculate_growth_rate(self) -> float:
        """Calcular tasa de crecimiento de usuarios"""
        current_month = date.today().replace(day=1)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        
        current_count = self.db.query(func.count(User.id)).filter(
            User.created_at >= current_month
        ).scalar()
        
        last_count = self.db.query(func.count(User.id)).filter(
            and_(
                User.created_at >= last_month,
                User.created_at < current_month
            )
        ).scalar()
        
        if last_count == 0:
            return 100.0 if current_count > 0 else 0.0
        
        return ((current_count - last_count) / last_count) * 100
    
    def _get_revenue_metrics(self) -> Dict[str, Any]:
        """Métricas de ingresos"""
        # TODO: Implementar cuando tengamos sistema de pagos completo
        return {
            "monthly_revenue": 0,
            "yearly_revenue": 0,
            "average_appointment_value": 0
        }
    
    def _get_appointment_trends(self) -> List[Dict[str, Any]]:
        """Tendencias de citas por día"""
        last_30_days = []
        today = date.today()
        
        for i in range(30):
            day = today - timedelta(days=i)
            count = self.db.query(func.count(Appointment.id)).filter(
                Appointment.appointment_date == day
            ).scalar()
            
            last_30_days.append({
                "date": day.isoformat(),
                "appointments": count
            })
        
        return list(reversed(last_30_days))
    
    def get_user_activity_report(self, start_date: date, end_date: date) -> Dict[str, Any]:
        """Reporte de actividad de usuarios"""
        active_users = self.db.query(func.count(func.distinct(User.id))).filter(
            and_(
                User.is_active == True,
                User.last_login >= start_date,
                User.last_login <= end_date
            )
        ).scalar()
        
        new_registrations = self.db.query(func.count(User.id)).filter(
            and_(
                User.created_at >= start_date,
                User.created_at <= end_date
            )
        ).scalar()
        
        return {
            "period": f"{start_date} to {end_date}",
            "active_users": active_users,
            "new_registrations": new_registrations,
            "user_breakdown": self._get_user_breakdown_by_role()
        }
    
    def _get_user_breakdown_by_role(self) -> Dict[str, int]:
        """Desglose de usuarios por rol"""
        result = self.db.query(
            User.role,
            func.count(User.id).label('count')
        ).filter(User.is_active == True).group_by(User.role).all()
        
        return {role.value: count for role, count in result}
