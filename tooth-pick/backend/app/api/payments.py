# 🦷 ToothPick Backend - Payment API Endpoints
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..services.payment_service import PaymentService
from ..services.auth_service import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

# Modelos de request
class B2BPaymentRequest(BaseModel):
    provider_id: str
    product_ids: List[str]
    quantities: List[int]
    total_amount: float
    currency: str = "USD"
    payment_method: str = "stripe"

class B2CPaymentRequest(BaseModel):
    distributor_id: str
    product_ids: List[str]
    quantities: List[int]
    total_amount: float
    currency: str = "USD"
    payment_method: str = "stripe"

class AppointmentPaymentRequest(BaseModel):
    dentist_id: str
    appointment_id: str
    amount: float
    currency: str = "USD"
    payment_method: str = "stripe"

class PaymentConfirmationRequest(BaseModel):
    payment_intent_id: str
    commission_transaction_id: str

class RefundRequest(BaseModel):
    payment_intent_id: str
    amount: Optional[float] = None
    reason: str = "requested_by_customer"

class BankTransferRequest(BaseModel):
    amount: float
    currency: str
    transaction_type: str

@router.post("/b2b/create")
async def create_b2b_payment(
    request: B2BPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear pago B2B (Distribuidor → Proveedor)"""
    try:
        # Verificar que el usuario actual sea distribuidor
        if current_user.role.value != "distributor":
            raise HTTPException(status_code=403, detail="Solo distribuidores pueden realizar pagos B2B")
        
        payment_data = PaymentService.process_b2b_payment(
            db=db,
            distributor_id=str(current_user.id),
            provider_id=request.provider_id,
            product_ids=request.product_ids,
            quantities=request.quantities,
            total_amount=request.total_amount,
            currency=request.currency,
            payment_method=request.payment_method
        )
        
        return {
            "status": "created",
            "transaction_type": "B2B",
            **payment_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando pago B2B: {str(e)}")

@router.post("/b2c/create")
async def create_b2c_payment(
    request: B2CPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear pago B2C (Cliente → Distribuidor)"""
    try:
        payment_data = PaymentService.process_b2c_payment(
            db=db,
            customer_id=str(current_user.id),
            distributor_id=request.distributor_id,
            product_ids=request.product_ids,
            quantities=request.quantities,
            total_amount=request.total_amount,
            currency=request.currency,
            payment_method=request.payment_method
        )
        
        return {
            "status": "created",
            "transaction_type": "B2C",
            **payment_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando pago B2C: {str(e)}")

@router.post("/appointment/create")
async def create_appointment_payment(
    request: AppointmentPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear pago de cita dental"""
    try:
        payment_data = PaymentService.process_appointment_payment(
            db=db,
            patient_id=str(current_user.id),
            dentist_id=request.dentist_id,
            appointment_id=request.appointment_id,
            amount=request.amount,
            currency=request.currency,
            payment_method=request.payment_method
        )
        
        return {
            "status": "created",
            "transaction_type": "appointment",
            **payment_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando pago de cita: {str(e)}")

@router.post("/confirm")
async def confirm_payment(
    request: PaymentConfirmationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Confirmar pago exitoso"""
    try:
        success = PaymentService.confirm_payment(
            db=db,
            payment_intent_id=request.payment_intent_id,
            commission_transaction_id=request.commission_transaction_id
        )
        
        if success:
            return {"status": "confirmed", "message": "Pago confirmado exitosamente"}
        else:
            raise HTTPException(status_code=400, detail="No se pudo confirmar el pago")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error confirmando pago: {str(e)}")

@router.post("/refund")
async def create_refund(
    request: RefundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear reembolso"""
    try:
        # Solo admin o el usuario que hizo el pago pueden solicitar reembolsos
        if current_user.role.value not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="No autorizado para crear reembolsos")
        
        refund_data = PaymentService.create_refund(
            payment_intent_id=request.payment_intent_id,
            amount=request.amount,
            reason=request.reason
        )
        
        return {
            "status": "refund_created",
            **refund_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando reembolso: {str(e)}")

@router.post("/bank-transfer/instructions")
async def generate_bank_transfer_instructions(
    request: BankTransferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generar instrucciones para transferencia bancaria"""
    try:
        # Generar código de referencia único
        reference_code = f"TP{datetime.now().strftime('%Y%m%d')}{str(current_user.id)[-4:]}{request.transaction_type.upper()}"
        
        instructions = PaymentService.generate_bank_transfer_instructions(
            amount=request.amount,
            currency=request.currency,
            reference_code=reference_code
        )
        
        return {
            "status": "instructions_generated",
            **instructions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando instrucciones: {str(e)}")

@router.get("/commissions/summary")
async def get_commission_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen de comisiones del usuario"""
    try:
        summary = PaymentService.get_commission_summary(
            db=db,
            user_id=str(current_user.id),
            start_date=start_date,
            end_date=end_date
        )
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo resumen: {str(e)}")

@router.get("/admin/commissions/summary")
async def get_admin_commission_summary(
    user_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener resumen general de comisiones (solo admin)"""
    if current_user.role.value != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    try:
        summary = PaymentService.get_commission_summary(
            db=db,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo resumen: {str(e)}")

# ============ INFORMACIÓN DE COMISIONES ============

@router.get("/commission-rates")
async def get_commission_rates():
    """Obtener tasas de comisión actuales"""
    return {
        "commission_rates": {
            "B2B": {
                "rate": 5.5,
                "description": "Distribuidor comprando a Proveedor"
            },
            "B2C": {
                "rate": 8.5,
                "description": "Cliente final comprando a Distribuidor"
            },
            "appointment": {
                "rate": 8.5,
                "description": "Pagos de citas dentales"
            }
        },
        "currency": "Porcentaje del monto total",
        "note": "Las comisiones pueden variar según el plan de suscripción del usuario"
    }

@router.get("/payment-methods")
async def get_payment_methods():
    """Obtener métodos de pago disponibles"""
    return {
        "payment_methods": {
            "stripe": {
                "name": "Tarjeta de Crédito/Débito",
                "supported_currencies": ["USD", "MXN", "EUR", "BRL"],
                "processing_time": "Inmediato",
                "fees": "2.9% + $0.30 USD"
            },
            "bank_transfer": {
                "name": "Transferencia Bancaria",
                "supported_currencies": ["USD", "MXN"],
                "processing_time": "1-3 días hábiles",
                "fees": "Sin costo adicional"
            },
            "spei": {
                "name": "SPEI (México)",
                "supported_currencies": ["MXN"],
                "processing_time": "Inmediato",
                "fees": "Según banco emisor"
            }
        }
    }
