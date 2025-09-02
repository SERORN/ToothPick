from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any
from datetime import datetime, date, timedelta
from ..database import get_db
from ..models.user import User, UserRole
from ..services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard/{user_id}")
async def get_dashboard_overview(
    user_id: int,
    user_role: str,
    db: Session = Depends(get_db)
):
    """Obtener overview del dashboard según rol de usuario"""
    analytics_service = AnalyticsService(db)
    
    try:
        role_enum = UserRole(user_role)
        overview = analytics_service.get_dashboard_overview(user_id, role_enum)
        
        return {
            "user_id": user_id,
            "user_role": user_role,
            "overview": overview,
            "generated_at": datetime.now().isoformat()
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol de usuario inválido"
        )

@router.get("/admin/overview")
async def get_admin_overview(db: Session = Depends(get_db)):
    """Overview completo para administradores"""
    analytics_service = AnalyticsService(db)
    overview = analytics_service._get_admin_overview()
    
    return {
        "dashboard_type": "admin",
        "data": overview,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/dentist/{dentist_id}/overview")
async def get_dentist_overview(dentist_id: int, db: Session = Depends(get_db)):
    """Overview para dentistas específicos"""
    analytics_service = AnalyticsService(db)
    overview = analytics_service._get_dentist_overview(dentist_id)
    
    return {
        "dashboard_type": "dentist",
        "dentist_id": dentist_id,
        "data": overview,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/provider/{provider_id}/overview")
async def get_provider_overview(provider_id: int, db: Session = Depends(get_db)):
    """Overview para proveedores específicos"""
    analytics_service = AnalyticsService(db)
    overview = analytics_service._get_provider_overview(provider_id)
    
    return {
        "dashboard_type": "provider",
        "provider_id": provider_id,
        "data": overview,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/patient/{patient_id}/overview")
async def get_patient_overview(patient_id: int, db: Session = Depends(get_db)):
    """Overview para pacientes específicos"""
    analytics_service = AnalyticsService(db)
    overview = analytics_service._get_patient_overview(patient_id)
    
    return {
        "dashboard_type": "patient",
        "patient_id": patient_id,
        "data": overview,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/users/activity-report")
async def get_user_activity_report(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """Reporte de actividad de usuarios"""
    analytics_service = AnalyticsService(db)
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        if start > end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha de inicio debe ser anterior a la fecha final"
            )
        
        report = analytics_service.get_user_activity_report(start, end)
        
        return {
            "report_type": "user_activity",
            "data": report,
            "generated_at": datetime.now().isoformat()
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de fecha inválido. Usar YYYY-MM-DD"
        )

@router.get("/appointments/trends")
async def get_appointment_trends(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db)
):
    """Obtener tendencias de citas"""
    analytics_service = AnalyticsService(db)
    trends = analytics_service._get_appointment_trends()
    
    # Filtrar solo los últimos N días
    filtered_trends = trends[-days:] if len(trends) > days else trends
    
    return {
        "report_type": "appointment_trends",
        "period_days": days,
        "data": filtered_trends,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/users/breakdown")
async def get_user_breakdown(db: Session = Depends(get_db)):
    """Desglose de usuarios por rol"""
    analytics_service = AnalyticsService(db)
    breakdown = analytics_service._get_user_breakdown_by_role()
    
    total_users = sum(breakdown.values())
    
    # Calcular porcentajes
    breakdown_with_percentages = {}
    for role, count in breakdown.items():
        percentage = (count / total_users * 100) if total_users > 0 else 0
        breakdown_with_percentages[role] = {
            "count": count,
            "percentage": round(percentage, 2)
        }
    
    return {
        "report_type": "user_breakdown",
        "total_users": total_users,
        "breakdown": breakdown_with_percentages,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/revenue/metrics")
async def get_revenue_metrics(
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
    db: Session = Depends(get_db)
):
    """Métricas de ingresos"""
    analytics_service = AnalyticsService(db)
    
    # Calcular fechas según el período
    today = date.today()
    
    if period == "week":
        start_date = today - timedelta(days=7)
    elif period == "month":
        start_date = today.replace(day=1)
    elif period == "quarter":
        # Último trimestre
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        start_date = today.replace(month=quarter_start_month, day=1)
    else:  # year
        start_date = today.replace(month=1, day=1)
    
    metrics = analytics_service._get_revenue_metrics()
    
    return {
        "report_type": "revenue_metrics",
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": today.isoformat(),
        "data": metrics,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/growth/rate")
async def get_growth_rate(db: Session = Depends(get_db)):
    """Tasa de crecimiento de usuarios"""
    analytics_service = AnalyticsService(db)
    growth_rate = analytics_service._calculate_growth_rate()
    
    return {
        "report_type": "growth_rate",
        "growth_rate_percentage": round(growth_rate, 2),
        "period": "monthly",
        "generated_at": datetime.now().isoformat()
    }

@router.get("/performance/summary")
async def get_performance_summary(db: Session = Depends(get_db)):
    """Resumen de rendimiento general de la plataforma"""
    analytics_service = AnalyticsService(db)
    
    # Obtener métricas combinadas
    admin_overview = analytics_service._get_admin_overview()
    growth_rate = analytics_service._calculate_growth_rate()
    user_breakdown = analytics_service._get_user_breakdown_by_role()
    
    return {
        "report_type": "performance_summary",
        "summary": {
            "total_users": admin_overview.get("total_users", 0),
            "total_appointments": admin_overview.get("total_appointments", 0),
            "total_products": admin_overview.get("total_products", 0),
            "growth_rate": round(growth_rate, 2),
            "user_distribution": user_breakdown,
            "monthly_new_users": admin_overview.get("new_users_30d", 0)
        },
        "status": "healthy" if growth_rate > 0 else "stable",
        "generated_at": datetime.now().isoformat()
    }

@router.get("/realtime/stats")
async def get_realtime_stats(db: Session = Depends(get_db)):
    """Estadísticas en tiempo real"""
    analytics_service = AnalyticsService(db)
    
    # Obtener estadísticas administrativas
    admin_overview = analytics_service._get_admin_overview()
    
    # Usuarios activos en las últimas 24 horas (simulado)
    active_users_24h = admin_overview.get("total_users", 0) * 0.1  # 10% estimado
    
    return {
        "report_type": "realtime_stats",
        "stats": {
            "appointments_today": admin_overview.get("today_appointments", 0),
            "active_users_24h": int(active_users_24h),
            "system_status": "operational",
            "last_updated": datetime.now().isoformat()
        },
        "generated_at": datetime.now().isoformat()
    }
