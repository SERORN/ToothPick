# 🦷 ToothPick Backend - Subscription Models
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .base import Base

class SubscriptionStatus(enum.Enum):
    """Estados de suscripción"""
    TRIALING = "trialing"
    ACTIVE = "active" 
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    EXPIRED = "expired"
    INCOMPLETE = "incomplete"

class BillingCycle(enum.Enum):
    """Ciclos de facturación"""
    MONTHLY = "monthly"
    ANNUALLY = "annually"

class PaymentProvider(enum.Enum):
    """Proveedores de pago"""
    STRIPE = "stripe"
    PAYPAL = "paypal"
    SPEI = "spei"
    BANK_TRANSFER = "bank_transfer"

class SubscriptionPlan(Base):
    """Planes de suscripción disponibles"""
    __tablename__ = "subscription_plans"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # Basic, Pro, Premium
    slug = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    
    # Precios por moneda
    price_usd_monthly = Column(Float, nullable=False)
    price_usd_annually = Column(Float, nullable=False)
    price_mxn_monthly = Column(Float, nullable=False)
    price_mxn_annually = Column(Float, nullable=False)
    
    # Características del plan
    max_appointments = Column(Integer, default=20)  # -1 para ilimitado
    commission_rate = Column(Float, default=8.5)  # Porcentaje de comisión
    priority_listing = Column(Boolean, default=False)
    advanced_analytics = Column(Boolean, default=False)
    marketplace_access = Column(Boolean, default=False)
    custom_website = Column(Boolean, default=False)
    marketing_automation = Column(Boolean, default=False)
    priority_support = Column(Boolean, default=False)
    custom_branding = Column(Boolean, default=False)
    api_access = Column(Boolean, default=False)
    export_data = Column(Boolean, default=False)
    
    # Trial y descuentos
    trial_days = Column(Integer, default=14)
    annual_discount_percentage = Column(Float, default=20.0)
    
    # IDs de Stripe
    stripe_product_id = Column(String(255))
    stripe_price_monthly_id = Column(String(255))
    stripe_price_annually_id = Column(String(255))
    
    # Metadatos
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    subscriptions = relationship("UserSubscription", back_populates="plan")

class UserSubscription(Base):
    """Suscripciones de usuarios"""
    __tablename__ = "user_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    
    # Estado y fechas
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIALING)
    billing_cycle = Column(Enum(BillingCycle), default=BillingCycle.MONTHLY)
    currency = Column(String(3), default="USD")  # USD, MXN, EUR, etc.
    amount = Column(Float, nullable=False)
    
    # Fechas importantes
    start_date = Column(DateTime(timezone=True), server_default=func.now())
    trial_end = Column(DateTime(timezone=True))
    current_period_start = Column(DateTime(timezone=True), nullable=False)
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    canceled_at = Column(DateTime(timezone=True))
    ended_at = Column(DateTime(timezone=True))
    
    # Datos de pago
    payment_provider = Column(Enum(PaymentProvider), default=PaymentProvider.STRIPE)
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255), unique=True)
    stripe_price_id = Column(String(255))
    
    # Datos de facturación
    requires_cfdi = Column(Boolean, default=False)
    fiscal_data = Column(JSON)  # RFC, razón social, dirección, etc.
    
    # Métricas de uso
    appointments_this_month = Column(Integer, default=0)
    last_appointment_date = Column(DateTime(timezone=True))
    
    # Métricas financieras
    total_paid = Column(Float, default=0.0)
    invoices_paid = Column(Integer, default=0)
    invoices_failed = Column(Integer, default=0)
    total_revenue_generated = Column(Float, default=0.0)  # Comisiones generadas
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("User", back_populates="subscription")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payment_transactions = relationship("PaymentTransaction", back_populates="subscription")

class PaymentTransaction(Base):
    """Transacciones de pago para suscripciones"""
    __tablename__ = "payment_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("user_subscriptions.id"), nullable=False)
    
    # Datos de la transacción
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    payment_provider = Column(Enum(PaymentProvider), nullable=False)
    
    # Estado y referencias externas
    status = Column(String(50), default="pending")  # pending, completed, failed, refunded
    stripe_payment_intent_id = Column(String(255))
    stripe_invoice_id = Column(String(255))
    paypal_order_id = Column(String(255))
    
    # Fechas
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    
    # Metadatos
    metadata = Column(JSON)
    failure_reason = Column(Text)
    
    # Relaciones
    subscription = relationship("UserSubscription", back_populates="payment_transactions")

class CommissionTransaction(Base):
    """Transacciones de comisiones de la plataforma"""
    __tablename__ = "commission_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"))
    appointment_id = Column(UUID(as_uuid=True), ForeignKey("appointments.id"))
    
    # Datos de la comisión
    transaction_type = Column(String(20), nullable=False)  # B2B, B2C, subscription
    gross_amount = Column(Float, nullable=False)  # Monto bruto de la transacción
    commission_rate = Column(Float, nullable=False)  # Porcentaje de comisión
    commission_amount = Column(Float, nullable=False)  # Monto de comisión
    net_amount = Column(Float, nullable=False)  # Monto que recibe el vendedor
    
    # Moneda y fecha
    currency = Column(String(3), default="USD")
    transaction_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Estado de pago
    status = Column(String(20), default="pending")  # pending, paid, failed
    paid_at = Column(DateTime(timezone=True))
    
    # Metadatos
    description = Column(Text)
    metadata = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("User")
