# 🦷 ToothPick Backend - Payment Processing Service  
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import stripe
import hashlib
import secrets
from decimal import Decimal

from ..models.subscription import CommissionTransaction, PaymentTransaction
from ..models.user import User
from ..models.product import Product
from ..models.appointment import Appointment
from ..core.config import settings

# Configurar Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:
    """Servicio para procesamiento de pagos y comisiones"""
    
    # Tasas de comisión por tipo de transacción
    COMMISSION_RATES = {
        "B2B": 0.055,      # 5.5% - Distribuidor comprando a Proveedor
        "B2C": 0.085,      # 8.5% - Cliente final comprando a Distribuidor  
        "appointment": 0.085,  # 8.5% - Citas dentales
        "subscription": 0.00   # 0% - Suscripciones (ya son pago directo)
    }
    
    @staticmethod
    def create_payment_intent(
        amount: float,
        currency: str = "USD", 
        customer_id: str = None,
        payment_method_id: str = None,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Crear Payment Intent de Stripe"""
        
        try:
            # Convertir a centavos para Stripe
            amount_cents = int(amount * 100)
            
            payment_intent_data = {
                "amount": amount_cents,
                "currency": currency.lower(),
                "automatic_payment_methods": {"enabled": True},
                "metadata": metadata or {}
            }
            
            if customer_id:
                payment_intent_data["customer"] = customer_id
            
            if payment_method_id:
                payment_intent_data["payment_method"] = payment_method_id
                payment_intent_data["confirmation_method"] = "manual"
                payment_intent_data["confirm"] = True
            
            payment_intent = stripe.PaymentIntent.create(**payment_intent_data)
            
            return {
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "status": payment_intent.status,
                "amount": amount,
                "currency": currency
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Error en Stripe: {str(e)}")
    
    @staticmethod
    def process_b2b_payment(
        db: Session,
        distributor_id: str,
        provider_id: str,
        product_ids: List[str],
        quantities: List[int],
        total_amount: float,
        currency: str = "USD",
        payment_method: str = "stripe"
    ) -> Dict[str, Any]:
        """Procesar pago B2B (Distribuidor → Proveedor)"""
        
        # Calcular comisión
        commission_rate = PaymentService.COMMISSION_RATES["B2B"]
        commission_amount = total_amount * commission_rate
        provider_amount = total_amount - commission_amount
        
        # Crear transacción de comisión
        commission_transaction = CommissionTransaction(
            user_id=provider_id,
            transaction_type="B2B",
            gross_amount=total_amount,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            net_amount=provider_amount,
            currency=currency,
            description=f"Venta B2B - Productos: {', '.join(product_ids)}",
            status="pending"
        )
        
        db.add(commission_transaction)
        db.commit()
        
        # Si es pago con Stripe, crear Payment Intent
        if payment_method == "stripe":
            payment_intent = PaymentService.create_payment_intent(
                amount=total_amount,
                currency=currency,
                metadata={
                    "transaction_type": "B2B",
                    "distributor_id": distributor_id,
                    "provider_id": provider_id,
                    "commission_transaction_id": str(commission_transaction.id)
                }
            )
            
            return {
                **payment_intent,
                "commission_amount": commission_amount,
                "provider_amount": provider_amount,
                "commission_transaction_id": str(commission_transaction.id)
            }
        
        return {
            "commission_amount": commission_amount,
            "provider_amount": provider_amount,
            "commission_transaction_id": str(commission_transaction.id)
        }
    
    @staticmethod
    def process_b2c_payment(
        db: Session,
        customer_id: str,
        distributor_id: str,
        product_ids: List[str],
        quantities: List[int],
        total_amount: float,
        currency: str = "USD",
        payment_method: str = "stripe"
    ) -> Dict[str, Any]:
        """Procesar pago B2C (Cliente → Distribuidor)"""
        
        # Calcular comisión
        commission_rate = PaymentService.COMMISSION_RATES["B2C"]
        commission_amount = total_amount * commission_rate
        distributor_amount = total_amount - commission_amount
        
        # Crear transacción de comisión
        commission_transaction = CommissionTransaction(
            user_id=distributor_id,
            transaction_type="B2C",
            gross_amount=total_amount,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            net_amount=distributor_amount,
            currency=currency,
            description=f"Venta B2C - Productos: {', '.join(product_ids)}",
            status="pending"
        )
        
        db.add(commission_transaction)
        db.commit()
        
        if payment_method == "stripe":
            payment_intent = PaymentService.create_payment_intent(
                amount=total_amount,
                currency=currency,
                metadata={
                    "transaction_type": "B2C",
                    "customer_id": customer_id,
                    "distributor_id": distributor_id,
                    "commission_transaction_id": str(commission_transaction.id)
                }
            )
            
            return {
                **payment_intent,
                "commission_amount": commission_amount,
                "distributor_amount": distributor_amount,
                "commission_transaction_id": str(commission_transaction.id)
            }
        
        return {
            "commission_amount": commission_amount,
            "distributor_amount": distributor_amount,
            "commission_transaction_id": str(commission_transaction.id)
        }
    
    @staticmethod
    def process_appointment_payment(
        db: Session,
        patient_id: str,
        dentist_id: str,
        appointment_id: str,
        amount: float,
        currency: str = "USD",
        payment_method: str = "stripe"
    ) -> Dict[str, Any]:
        """Procesar pago de cita dental"""
        
        # Calcular comisión
        commission_rate = PaymentService.COMMISSION_RATES["appointment"]
        commission_amount = amount * commission_rate
        dentist_amount = amount - commission_amount
        
        # Crear transacción de comisión
        commission_transaction = CommissionTransaction(
            user_id=dentist_id,
            appointment_id=appointment_id,
            transaction_type="appointment",
            gross_amount=amount,
            commission_rate=commission_rate,
            commission_amount=commission_amount,
            net_amount=dentist_amount,
            currency=currency,
            description=f"Pago de cita dental - ID: {appointment_id}",
            status="pending"
        )
        
        db.add(commission_transaction)
        db.commit()
        
        if payment_method == "stripe":
            payment_intent = PaymentService.create_payment_intent(
                amount=amount,
                currency=currency,
                metadata={
                    "transaction_type": "appointment",
                    "patient_id": patient_id,
                    "dentist_id": dentist_id,
                    "appointment_id": appointment_id,
                    "commission_transaction_id": str(commission_transaction.id)
                }
            )
            
            return {
                **payment_intent,
                "commission_amount": commission_amount,
                "dentist_amount": dentist_amount,
                "commission_transaction_id": str(commission_transaction.id)
            }
        
        return {
            "commission_amount": commission_amount,
            "dentist_amount": dentist_amount,
            "commission_transaction_id": str(commission_transaction.id)
        }
    
    @staticmethod
    def confirm_payment(
        db: Session,
        payment_intent_id: str,
        commission_transaction_id: str
    ) -> bool:
        """Confirmar pago exitoso y actualizar estado de comisión"""
        
        try:
            # Obtener Payment Intent de Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status == "succeeded":
                # Actualizar transacción de comisión
                commission_transaction = db.query(CommissionTransaction).filter(
                    CommissionTransaction.id == commission_transaction_id
                ).first()
                
                if commission_transaction:
                    commission_transaction.status = "paid"
                    commission_transaction.paid_at = datetime.now()
                    db.commit()
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error confirmando pago: {e}")
            return False
    
    @staticmethod
    def create_refund(
        payment_intent_id: str,
        amount: float = None,
        reason: str = "requested_by_customer"
    ) -> Dict[str, Any]:
        """Crear reembolso en Stripe"""
        
        try:
            refund_data = {
                "payment_intent": payment_intent_id,
                "reason": reason
            }
            
            if amount:
                refund_data["amount"] = int(amount * 100)  # Convertir a centavos
            
            refund = stripe.Refund.create(**refund_data)
            
            return {
                "refund_id": refund.id,
                "status": refund.status,
                "amount": refund.amount / 100,
                "currency": refund.currency
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Error creando reembolso: {str(e)}")
    
    @staticmethod
    def generate_bank_transfer_instructions(
        amount: float,
        currency: str,
        reference_code: str
    ) -> Dict[str, Any]:
        """Generar instrucciones para transferencia bancaria"""
        
        # Datos bancarios de ToothPick (ejemplo)
        bank_accounts = {
            "USD": {
                "bank_name": "Bank of America",
                "account_number": "****1234",
                "routing_number": "021000021",
                "swift_code": "BOFAUS3N",
                "account_holder": "ToothPick Inc."
            },
            "MXN": {
                "bank_name": "BBVA México",
                "account_number": "****5678",
                "clabe": "012180001234567890",
                "account_holder": "ToothPick México S.A. de C.V."
            }
        }
        
        account_info = bank_accounts.get(currency, bank_accounts["USD"])
        
        return {
            "amount": amount,
            "currency": currency,
            "reference_code": reference_code,
            "bank_account": account_info,
            "instructions": f"Transferir {amount} {currency} a la cuenta indicada usando como referencia: {reference_code}",
            "expiry_hours": 48
        }
    
    @staticmethod
    def get_commission_summary(
        db: Session,
        user_id: str = None,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> Dict[str, Any]:
        """Obtener resumen de comisiones"""
        
        query = db.query(CommissionTransaction)
        
        if user_id:
            query = query.filter(CommissionTransaction.user_id == user_id)
        
        if start_date:
            query = query.filter(CommissionTransaction.transaction_date >= start_date)
        
        if end_date:
            query = query.filter(CommissionTransaction.transaction_date <= end_date)
        
        # Métricas generales
        total_transactions = query.count()
        total_gross = query.with_entities(func.sum(CommissionTransaction.gross_amount)).scalar() or 0
        total_commissions = query.with_entities(func.sum(CommissionTransaction.commission_amount)).scalar() or 0
        total_net = query.with_entities(func.sum(CommissionTransaction.net_amount)).scalar() or 0
        
        # Por tipo de transacción
        b2b_stats = query.filter(CommissionTransaction.transaction_type == "B2B").with_entities(
            func.count(CommissionTransaction.id),
            func.sum(CommissionTransaction.commission_amount)
        ).first()
        
        b2c_stats = query.filter(CommissionTransaction.transaction_type == "B2C").with_entities(
            func.count(CommissionTransaction.id),
            func.sum(CommissionTransaction.commission_amount)
        ).first()
        
        appointment_stats = query.filter(CommissionTransaction.transaction_type == "appointment").with_entities(
            func.count(CommissionTransaction.id),
            func.sum(CommissionTransaction.commission_amount)
        ).first()
        
        return {
            "total_transactions": total_transactions,
            "total_gross_amount": float(total_gross),
            "total_commission_amount": float(total_commissions),
            "total_net_amount": float(total_net),
            "commission_percentage": (total_commissions / total_gross * 100) if total_gross > 0 else 0,
            "b2b": {
                "transactions": b2b_stats[0] or 0,
                "commission_amount": float(b2b_stats[1] or 0)
            },
            "b2c": {
                "transactions": b2c_stats[0] or 0,
                "commission_amount": float(b2c_stats[1] or 0)
            },
            "appointments": {
                "transactions": appointment_stats[0] or 0,
                "commission_amount": float(appointment_stats[1] or 0)
            }
        }
