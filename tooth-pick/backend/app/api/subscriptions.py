# 🦷 ToothPick Backend - Subscription API Endpoints
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import stripe
import json

from ..database import get_db
from ..services.subscription_service import SubscriptionService
from ..services.auth_service import AuthService, get_current_user
from ..models.subscription import SubscriptionPlan, UserSubscription
from ..models.user import User
from ..core.config import settings

# Configurar Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/v1/subscriptions", tags=["subscriptions"])

# Modelos de respuesta
class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    price_usd_monthly: float
    price_usd_annually: float
    price_mxn_monthly: float
    price_mxn_annually: float
    max_appointments: int
    commission_rate: float
    priority_listing: bool
    advanced_analytics: bool
    marketplace_access: bool
    custom_website: bool
    marketing_automation: bool
    priority_support: bool
    custom_branding: bool
    api_access: bool
    export_data: bool
    trial_days: int
    annual_discount_percentage: float
    is_popular: bool

class UserSubscriptionResponse(BaseModel):
    id: str
    status: str
    billing_cycle: str
    currency: str
    amount: float
    current_period_end: str
    trial_end: Optional[str]
    plan: SubscriptionPlanResponse

class CheckoutSessionRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"
    currency: str = "USD"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CommissionCalculationRequest(BaseModel):
    amount: float
    transaction_type: str  # B2B, B2C, appointment

@router.get("/plans", response_model=List[SubscriptionPlanResponse])
async def get_subscription_plans(
    user_role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtener planes de suscripción disponibles"""
    try:
        plans = SubscriptionService.get_subscription_plans(user_role)
        return [SubscriptionPlanResponse(**plan.__dict__) for plan in plans]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo planes: {str(e)}")

@router.get("/my-subscription", response_model=UserSubscriptionResponse)
async def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener suscripción actual del usuario"""
    try:
        subscription = SubscriptionService.get_user_subscription(db, str(current_user.id))
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No se encontró suscripción activa")
        
        return UserSubscriptionResponse(**subscription.__dict__)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo suscripción: {str(e)}")

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear sesión de checkout de Stripe"""
    try:
        checkout_data = SubscriptionService.create_stripe_checkout_session(
            db=db,
            user_id=str(current_user.id),
            plan_id=request.plan_id,
            billing_cycle=request.billing_cycle,
            currency=request.currency,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        
        return checkout_data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando checkout: {str(e)}")

@router.post("/calculate-commission")
async def calculate_commission(
    request: CommissionCalculationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calcular comisión para una transacción"""
    try:
        user_subscription = SubscriptionService.get_user_subscription(db, str(current_user.id))
        
        commission_data = SubscriptionService.calculate_commission(
            amount=request.amount,
            transaction_type=request.transaction_type,
            user_subscription=user_subscription
        )
        
        return commission_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando comisión: {str(e)}")

@router.get("/analytics")
async def get_subscription_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener analytics de suscripciones del usuario"""
    try:
        analytics = SubscriptionService.get_subscription_analytics(db, str(current_user.id))
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo analytics: {str(e)}")

@router.post("/cancel")
async def cancel_subscription(
    immediately: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancelar suscripción"""
    try:
        subscription = SubscriptionService.get_user_subscription(db, str(current_user.id))
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No se encontró suscripción activa")
        
        if not subscription.stripe_subscription_id:
            raise HTTPException(status_code=400, detail="Suscripción no tiene ID de Stripe")
        
        # Cancelar en Stripe
        if immediately:
            stripe.Subscription.cancel(subscription.stripe_subscription_id)
        else:
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
        
        return {"message": "Suscripción cancelada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelando suscripción: {str(e)}")

@router.post("/reactivate")
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reactivar suscripción cancelada"""
    try:
        subscription = SubscriptionService.get_user_subscription(db, str(current_user.id))
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No se encontró suscripción")
        
        if not subscription.stripe_subscription_id:
            raise HTTPException(status_code=400, detail="Suscripción no tiene ID de Stripe")
        
        # Reactivar en Stripe
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )
        
        return {"message": "Suscripción reactivada exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reactivando suscripción: {str(e)}")

@router.get("/customer-portal")
async def create_customer_portal_session(
    return_url: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear sesión del portal de cliente de Stripe"""
    try:
        subscription = SubscriptionService.get_user_subscription(db, str(current_user.id))
        
        if not subscription or not subscription.stripe_customer_id:
            raise HTTPException(status_code=404, detail="No se encontró customer de Stripe")
        
        # Crear portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=return_url or f"{settings.FRONTEND_URL}/subscription"
        )
        
        return {"portal_url": portal_session.url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando portal: {str(e)}")

# Webhook de Stripe
@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Manejar webhooks de Stripe"""
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Stripe signature missing")
        
        # Verificar webhook
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Procesar evento
        success = SubscriptionService.handle_stripe_webhook(db, event)
        
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=400, detail="Error procesando webhook")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en webhook: {str(e)}")

# ============ ENDPOINTS ADMIN ============

@router.get("/admin/analytics")
async def get_admin_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener analytics generales de suscripciones (solo admin)"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    try:
        analytics = SubscriptionService.get_subscription_analytics(db)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo analytics: {str(e)}")

@router.get("/admin/subscriptions")
async def get_all_subscriptions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener todas las suscripciones (solo admin)"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    try:
        query = db.query(UserSubscription)
        
        if status:
            query = query.filter(UserSubscription.status == status)
        
        subscriptions = query.offset(skip).limit(limit).all()
        
        return [UserSubscriptionResponse(**sub.__dict__) for sub in subscriptions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo suscripciones: {str(e)}")
