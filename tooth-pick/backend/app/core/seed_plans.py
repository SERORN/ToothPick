# 🦷 ToothPick Backend - Subscription Plans Seeder
from sqlalchemy.orm import Session
from ..models.subscription import SubscriptionPlan
from ..database import get_db

def seed_subscription_plans(db: Session):
    """Inicializar planes de suscripción en la base de datos"""
    
    # Verificar si ya existen planes
    existing_plans = db.query(SubscriptionPlan).count()
    if existing_plans > 0:
        print("✅ Planes de suscripción ya existen")
        return
    
    # Plan Básico (Freemium)
    basic_plan = SubscriptionPlan(
        name="Básico",
        slug="basic",
        description="Plan gratuito para comenzar en ToothPick",
        price_usd_monthly=0.0,
        price_usd_annually=0.0,
        price_mxn_monthly=0.0,
        price_mxn_annually=0.0,
        max_appointments=20,
        commission_rate=8.5,  # 8.5% de comisión
        priority_listing=False,
        advanced_analytics=False,
        marketplace_access=True,
        custom_website=False,
        marketing_automation=False,
        priority_support=False,
        custom_branding=False,
        api_access=False,
        export_data=False,
        trial_days=0,  # Sin trial porque ya es gratis
        annual_discount_percentage=0.0,
        stripe_product_id="prod_toothpick_basic",
        stripe_price_monthly_id="price_basic_monthly",
        stripe_price_annually_id="price_basic_annual",
        is_active=True,
        is_popular=False,
        sort_order=1
    )
    
    # Plan Profesional
    pro_plan = SubscriptionPlan(
        name="Profesional",
        slug="pro",
        description="Para clínicas que buscan crecer sin límites",
        price_usd_monthly=49.90,   # $49.90 USD
        price_usd_annually=479.04, # $479.04 USD (20% descuento)
        price_mxn_monthly=999.00,  # $999 MXN
        price_mxn_annually=9590.40, # $9,590.40 MXN (20% descuento)
        max_appointments=-1,  # Ilimitado
        commission_rate=0.0,  # Sin comisión
        priority_listing=True,
        advanced_analytics=True,
        marketplace_access=True,
        custom_website=False,
        marketing_automation=False,
        priority_support=False,
        custom_branding=True,
        api_access=True,
        export_data=True,
        trial_days=14,
        annual_discount_percentage=20.0,
        stripe_product_id="prod_toothpick_pro",
        stripe_price_monthly_id="price_pro_monthly",
        stripe_price_annually_id="price_pro_annual",
        is_active=True,
        is_popular=True,  # Plan más popular
        sort_order=2
    )
    
    # Plan Elite (Empresarial)
    elite_plan = SubscriptionPlan(
        name="Elite",
        slug="elite",
        description="Solución empresarial con todas las funcionalidades",
        price_usd_monthly=199.90,   # $199.90 USD
        price_usd_annually=1919.04, # $1,919.04 USD (20% descuento)
        price_mxn_monthly=3999.00,  # $3,999 MXN
        price_mxn_annually=38390.40, # $38,390.40 MXN (20% descuento)
        max_appointments=-1,  # Ilimitado
        commission_rate=0.0,  # Sin comisión
        priority_listing=True,
        advanced_analytics=True,
        marketplace_access=True,
        custom_website=True,
        marketing_automation=True,
        priority_support=True,
        custom_branding=True,
        api_access=True,
        export_data=True,
        trial_days=14,
        annual_discount_percentage=20.0,
        stripe_product_id="prod_toothpick_elite",
        stripe_price_monthly_id="price_elite_monthly",
        stripe_price_annually_id="price_elite_annual",
        is_active=True,
        is_popular=False,
        sort_order=3
    )
    
    # Agregar planes a la base de datos
    db.add(basic_plan)
    db.add(pro_plan)
    db.add(elite_plan)
    db.commit()
    
    print("✅ Planes de suscripción creados exitosamente:")
    print(f"   📦 {basic_plan.name} - Gratis")
    print(f"   🚀 {pro_plan.name} - ${pro_plan.price_usd_monthly}/mes")
    print(f"   👑 {elite_plan.name} - ${elite_plan.price_usd_monthly}/mes")

def update_stripe_price_ids():
    """Actualizar IDs de precios de Stripe en producción"""
    # Esta función se debe ejecutar después de crear los productos en Stripe
    pass

if __name__ == "__main__":
    # Para ejecutar directamente
    from ..database import SessionLocal
    
    db = SessionLocal()
    try:
        seed_subscription_plans(db)
    finally:
        db.close()
