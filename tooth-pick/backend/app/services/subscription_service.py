# 🦷 ToothPick Backend - Subscription Service
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import stripe
import os
from ..models.subscription import (
    SubscriptionPlan, 
    UserSubscription, 
    PaymentTransaction,
    CommissionTransaction,
    SubscriptionStatus, 
    BillingCycle,
    PaymentProvider
)
from ..models.user import User
from ..core.config import settings

# Configurar Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class SubscriptionService:
    """Servicio para gestión de suscripciones y monetización"""
    
    @staticmethod
    def get_subscription_plans(user_role: str = None) -> List[SubscriptionPlan]:
        """Obtener planes de suscripción disponibles"""
        query = Session.query(SubscriptionPlan).filter(
            SubscriptionPlan.is_active == True
        ).order_by(SubscriptionPlan.sort_order)
        
        return query.all()
    
    @staticmethod
    def get_user_subscription(db: Session, user_id: str) -> Optional[UserSubscription]:
        """Obtener suscripción activa del usuario"""
        return db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user_id,
                UserSubscription.status.in_([
                    SubscriptionStatus.ACTIVE,
                    SubscriptionStatus.TRIALING,
                    SubscriptionStatus.PAST_DUE
                ])
            )
        ).first()
    
    @staticmethod
    def create_stripe_checkout_session(
        db: Session,
        user_id: str,
        plan_id: str,
        billing_cycle: str = "monthly",
        currency: str = "USD",
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """Crear sesión de checkout de Stripe para nueva suscripción"""
        
        # Obtener plan
        plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.id == plan_id
        ).first()
        
        if not plan:
            raise ValueError("Plan no encontrado")
        
        # Obtener usuario
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("Usuario no encontrado")
        
        # Determinar precio según ciclo de facturación
        if billing_cycle == "annually":
            stripe_price_id = plan.stripe_price_annually_id
            amount = plan.price_usd_annually if currency == "USD" else plan.price_mxn_annually
        else:
            stripe_price_id = plan.stripe_price_monthly_id
            amount = plan.price_usd_monthly if currency == "USD" else plan.price_mxn_monthly
        
        # Crear o buscar customer de Stripe
        stripe_customer = None
        if user.stripe_customer_id:
            try:
                stripe_customer = stripe.Customer.retrieve(user.stripe_customer_id)
            except:
                stripe_customer = None
        
        if not stripe_customer:
            stripe_customer = stripe.Customer.create(
                email=user.email,
                name=f"{user.first_name} {user.last_name}",
                metadata={
                    "user_id": str(user.id),
                    "role": user.role.value
                }
            )
            # Actualizar user con stripe_customer_id
            user.stripe_customer_id = stripe_customer.id
            db.commit()
        
        # Crear sesión de checkout
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer.id,
            payment_method_types=['card'],
            mode='subscription',
            line_items=[{
                'price': stripe_price_id,
                'quantity': 1,
            }],
            success_url=success_url or f"{settings.FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url or f"{settings.FRONTEND_URL}/subscription/cancel",
            metadata={
                "user_id": str(user_id),
                "plan_id": str(plan_id),
                "billing_cycle": billing_cycle,
                "currency": currency
            },
            subscription_data={
                "trial_period_days": plan.trial_days if plan.trial_days > 0 else None,
                "metadata": {
                    "user_id": str(user_id),
                    "plan_id": str(plan_id)
                }
            },
            allow_promotion_codes=True,
            billing_address_collection='required'
        )
        
        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id,
            "amount": amount,
            "currency": currency,
            "plan_name": plan.name
        }
    
    @staticmethod
    def handle_stripe_webhook(db: Session, event_data: Dict[str, Any]) -> bool:
        """Manejar webhooks de Stripe"""
        
        event_type = event_data.get("type")
        
        try:
            if event_type == "checkout.session.completed":
                return SubscriptionService._handle_checkout_completed(db, event_data["data"]["object"])
            
            elif event_type == "invoice.payment_succeeded":
                return SubscriptionService._handle_payment_succeeded(db, event_data["data"]["object"])
            
            elif event_type == "invoice.payment_failed":
                return SubscriptionService._handle_payment_failed(db, event_data["data"]["object"])
            
            elif event_type == "customer.subscription.updated":
                return SubscriptionService._handle_subscription_updated(db, event_data["data"]["object"])
            
            elif event_type == "customer.subscription.deleted":
                return SubscriptionService._handle_subscription_canceled(db, event_data["data"]["object"])
            
            return True
            
        except Exception as e:
            print(f"Error procesando webhook: {e}")
            return False
    
    @staticmethod
    def _handle_checkout_completed(db: Session, session_data: Dict[str, Any]) -> bool:
        """Manejar checkout completado"""
        
        metadata = session_data.get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = metadata.get("plan_id")
        billing_cycle = metadata.get("billing_cycle", "monthly")
        currency = metadata.get("currency", "USD")
        
        if not user_id or not plan_id:
            return False
        
        # Obtener datos de la suscripción de Stripe
        stripe_subscription = stripe.Subscription.retrieve(session_data["subscription"])
        
        # Crear suscripción en base de datos
        subscription = UserSubscription(
            user_id=user_id,
            plan_id=plan_id,
            status=SubscriptionStatus.TRIALING if stripe_subscription.status == "trialing" else SubscriptionStatus.ACTIVE,
            billing_cycle=BillingCycle.ANNUALLY if billing_cycle == "annually" else BillingCycle.MONTHLY,
            currency=currency,
            amount=stripe_subscription.items.data[0].price.unit_amount / 100,
            current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
            trial_end=datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None,
            stripe_customer_id=session_data["customer"],
            stripe_subscription_id=stripe_subscription.id,
            stripe_price_id=stripe_subscription.items.data[0].price.id
        )
        
        db.add(subscription)
        db.commit()
        
        return True
    
    @staticmethod
    def _handle_payment_succeeded(db: Session, invoice_data: Dict[str, Any]) -> bool:
        """Manejar pago exitoso"""
        
        stripe_subscription_id = invoice_data.get("subscription")
        if not stripe_subscription_id:
            return False
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if not subscription:
            return False
        
        # Actualizar estado si estaba en past_due
        if subscription.status == SubscriptionStatus.PAST_DUE:
            subscription.status = SubscriptionStatus.ACTIVE
        
        # Actualizar métricas
        subscription.invoices_paid += 1
        subscription.total_paid += invoice_data["amount_paid"] / 100
        
        # Crear registro de transacción
        payment_transaction = PaymentTransaction(
            subscription_id=subscription.id,
            amount=invoice_data["amount_paid"] / 100,
            currency=invoice_data["currency"].upper(),
            payment_provider=PaymentProvider.STRIPE,
            status="completed",
            stripe_invoice_id=invoice_data["id"],
            processed_at=datetime.now()
        )
        
        db.add(payment_transaction)
        db.commit()
        
        return True
    
    @staticmethod
    def _handle_payment_failed(db: Session, invoice_data: Dict[str, Any]) -> bool:
        """Manejar pago fallido"""
        
        stripe_subscription_id = invoice_data.get("subscription")
        if not stripe_subscription_id:
            return False
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == stripe_subscription_id
        ).first()
        
        if not subscription:
            return False
        
        # Actualizar estado
        subscription.status = SubscriptionStatus.PAST_DUE
        subscription.invoices_failed += 1
        
        # Crear registro de transacción fallida
        payment_transaction = PaymentTransaction(
            subscription_id=subscription.id,
            amount=invoice_data["amount_due"] / 100,
            currency=invoice_data["currency"].upper(),
            payment_provider=PaymentProvider.STRIPE,
            status="failed",
            stripe_invoice_id=invoice_data["id"],
            failure_reason="Payment failed",
            processed_at=datetime.now()
        )
        
        db.add(payment_transaction)
        db.commit()
        
        return True
    
    @staticmethod
    def _handle_subscription_updated(db: Session, subscription_data: Dict[str, Any]) -> bool:
        """Manejar actualización de suscripción"""
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == subscription_data["id"]
        ).first()
        
        if not subscription:
            return False
        
        # Actualizar fechas del período
        subscription.current_period_start = datetime.fromtimestamp(subscription_data["current_period_start"])
        subscription.current_period_end = datetime.fromtimestamp(subscription_data["current_period_end"])
        
        # Actualizar estado
        if subscription_data["status"] == "active":
            subscription.status = SubscriptionStatus.ACTIVE
        elif subscription_data["status"] == "past_due":
            subscription.status = SubscriptionStatus.PAST_DUE
        elif subscription_data["status"] == "canceled":
            subscription.status = SubscriptionStatus.CANCELED
            subscription.canceled_at = datetime.now()
        
        db.commit()
        return True
    
    @staticmethod
    def _handle_subscription_canceled(db: Session, subscription_data: Dict[str, Any]) -> bool:
        """Manejar cancelación de suscripción"""
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == subscription_data["id"]
        ).first()
        
        if not subscription:
            return False
        
        subscription.status = SubscriptionStatus.CANCELED
        subscription.canceled_at = datetime.now()
        subscription.ended_at = datetime.now()
        
        db.commit()
        return True
    
    @staticmethod
    def calculate_commission(
        amount: float, 
        transaction_type: str, 
        user_subscription: Optional[UserSubscription] = None
    ) -> Dict[str, float]:
        """Calcular comisión de la plataforma"""
        
        # Comisiones por defecto
        commission_rates = {
            "B2B": 0.055,  # 5.5% para transacciones distribuidor-proveedor
            "B2C": 0.085,  # 8.5% para transacciones cliente-distribuidor
            "appointment": 0.085  # 8.5% para citas
        }
        
        # Si el usuario tiene suscripción, usar su tasa de comisión
        if user_subscription and user_subscription.plan:
            commission_rate = user_subscription.plan.commission_rate / 100
        else:
            commission_rate = commission_rates.get(transaction_type, 0.085)
        
        commission_amount = amount * commission_rate
        net_amount = amount - commission_amount
        
        return {
            "gross_amount": amount,
            "commission_rate": commission_rate,
            "commission_amount": commission_amount,
            "net_amount": net_amount
        }
    
    @staticmethod
    def record_commission_transaction(
        db: Session,
        user_id: str,
        transaction_type: str,
        gross_amount: float,
        currency: str = "USD",
        order_id: str = None,
        appointment_id: str = None,
        description: str = None
    ) -> CommissionTransaction:
        """Registrar transacción de comisión"""
        
        # Obtener suscripción del usuario
        user_subscription = SubscriptionService.get_user_subscription(db, user_id)
        
        # Calcular comisión
        commission_data = SubscriptionService.calculate_commission(
            gross_amount, transaction_type, user_subscription
        )
        
        # Crear registro de comisión
        commission_transaction = CommissionTransaction(
            user_id=user_id,
            order_id=order_id,
            appointment_id=appointment_id,
            transaction_type=transaction_type,
            gross_amount=commission_data["gross_amount"],
            commission_rate=commission_data["commission_rate"],
            commission_amount=commission_data["commission_amount"],
            net_amount=commission_data["net_amount"],
            currency=currency,
            description=description or f"Comisión {transaction_type}",
            status="pending"
        )
        
        db.add(commission_transaction)
        
        # Actualizar métricas de suscripción si existe
        if user_subscription:
            user_subscription.total_revenue_generated += commission_data["commission_amount"]
        
        db.commit()
        
        return commission_transaction
    
    @staticmethod
    def get_subscription_analytics(db: Session, user_id: str = None) -> Dict[str, Any]:
        """Obtener analytics de suscripciones"""
        
        base_query = db.query(UserSubscription)
        commission_query = db.query(CommissionTransaction)
        
        if user_id:
            base_query = base_query.filter(UserSubscription.user_id == user_id)
            commission_query = commission_query.filter(CommissionTransaction.user_id == user_id)
        
        # Métricas de suscripciones
        total_subscriptions = base_query.count()
        active_subscriptions = base_query.filter(
            UserSubscription.status == SubscriptionStatus.ACTIVE
        ).count()
        
        # Métricas financieras
        total_revenue = db.query(func.sum(UserSubscription.total_paid)).scalar() or 0
        total_commissions = db.query(func.sum(CommissionTransaction.commission_amount)).scalar() or 0
        
        # MRR (Monthly Recurring Revenue)
        mrr = db.query(func.sum(UserSubscription.amount)).filter(
            and_(
                UserSubscription.status == SubscriptionStatus.ACTIVE,
                UserSubscription.billing_cycle == BillingCycle.MONTHLY
            )
        ).scalar() or 0
        
        # ARR (Annual Recurring Revenue) 
        arr_annual = db.query(func.sum(UserSubscription.amount)).filter(
            and_(
                UserSubscription.status == SubscriptionStatus.ACTIVE,
                UserSubscription.billing_cycle == BillingCycle.ANNUALLY
            )
        ).scalar() or 0
        
        arr = (mrr * 12) + arr_annual
        
        return {
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "total_revenue": total_revenue,
            "total_commissions": total_commissions,
            "mrr": mrr,
            "arr": arr,
            "churn_rate": 0,  # TODO: Calcular churn rate
            "avg_revenue_per_user": total_revenue / total_subscriptions if total_subscriptions > 0 else 0
        }
