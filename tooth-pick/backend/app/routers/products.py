from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.product import Product, ProductCategory, ProductStatus
from ..models.user import User, UserRole
from ..services.product_service import ProductService
from ..services.auth_service import AuthService

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Obtener productos con filtros"""
    product_service = ProductService(db)
    
    if search:
        products = product_service.search_products(search, limit, offset)
    elif category:
        try:
            cat_enum = ProductCategory(category)
            products = product_service.get_products_by_category(cat_enum, limit, offset)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoría inválida"
            )
    else:
        products = db.query(Product).filter(
            Product.status == ProductStatus.ACTIVE
        ).offset(offset).limit(limit).all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category.value,
            "price": float(p.price),
            "sku": p.sku,
            "brand": p.brand,
            "stock_quantity": p.stock_quantity,
            "images": p.images,
            "status": p.status.value,
            "provider_id": p.provider_id,
            "created_at": p.created_at.isoformat()
        } for p in products
    ]

@router.get("/featured")
async def get_featured_products(db: Session = Depends(get_db)):
    """Obtener productos destacados"""
    product_service = ProductService(db)
    products = product_service.get_featured_products()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category.value,
            "price": float(p.price),
            "sku": p.sku,
            "brand": p.brand,
            "stock_quantity": p.stock_quantity,
            "images": p.images,
            "status": p.status.value
        } for p in products
    ]

@router.get("/bestsellers")
async def get_bestsellers(db: Session = Depends(get_db)):
    """Obtener productos más vendidos"""
    product_service = ProductService(db)
    products = product_service.get_bestsellers()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category.value,
            "price": float(p.price),
            "brand": p.brand,
            "stock_quantity": p.stock_quantity
        } for p in products
    ]

@router.get("/categories")
async def get_categories_with_count(db: Session = Depends(get_db)):
    """Obtener categorías con conteo de productos"""
    product_service = ProductService(db)
    return product_service.get_categories_with_count()

@router.get("/{product_id}")
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Obtener producto por ID"""
    product_service = ProductService(db)
    product = product_service.get_product_by_id(product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado"
        )
    
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "category": product.category.value,
        "price": float(product.price),
        "sku": product.sku,
        "brand": product.brand,
        "stock_quantity": product.stock_quantity,
        "min_order_quantity": product.min_order_quantity,
        "max_order_quantity": product.max_order_quantity,
        "specifications": product.specifications,
        "images": product.images,
        "status": product.status.value,
        "provider_id": product.provider_id,
        "created_at": product.created_at.isoformat()
    }

@router.post("/")
async def create_product(
    product_data: dict,
    db: Session = Depends(get_db)
):
    """Crear un nuevo producto"""
    product_service = ProductService(db)
    
    try:
        # Por ahora sin autenticación, usar provider_id del payload
        provider_id = product_data.get("provider_id", 1)
        product = product_service.create_product(product_data, provider_id)
        
        return {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "category": product.category.value,
            "price": float(product.price),
            "sku": product.sku,
            "message": "Producto creado exitosamente"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{product_id}")
async def update_product(
    product_id: int,
    product_data: dict,
    db: Session = Depends(get_db)
):
    """Actualizar producto existente"""
    product_service = ProductService(db)
    
    # Por ahora sin autenticación, usar provider_id del payload
    provider_id = product_data.get("provider_id", 1)
    
    updated_product = product_service.update_product(
        product_id, 
        product_data, 
        provider_id
    )
    
    if not updated_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado o no tienes permisos"
        )
    
    return {
        "id": updated_product.id,
        "name": updated_product.name,
        "price": float(updated_product.price),
        "message": "Producto actualizado exitosamente"
    }

@router.patch("/{product_id}/stock")
async def update_stock(
    product_id: int,
    quantity_change: int,
    db: Session = Depends(get_db)
):
    """Actualizar stock de producto"""
    product_service = ProductService(db)
    
    success = product_service.update_stock(product_id, quantity_change)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar el stock"
        )
    
    return {"message": "Stock actualizado correctamente"}

@router.delete("/{product_id}")
async def deactivate_product(
    product_id: int,
    provider_id: int,
    db: Session = Depends(get_db)
):
    """Desactivar producto (soft delete)"""
    product_service = ProductService(db)
    
    success = product_service.deactivate_product(product_id, provider_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado o no tienes permisos"
        )
    
    return {"message": "Producto desactivado correctamente"}

@router.get("/provider/{provider_id}")
async def get_provider_products(
    provider_id: int,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Obtener productos de un proveedor específico"""
    product_service = ProductService(db)
    products = product_service.get_products_by_provider(provider_id, limit, offset)
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "category": p.category.value,
            "price": float(p.price),
            "stock_quantity": p.stock_quantity,
            "status": p.status.value
        } for p in products
    ]

@router.get("/provider/{provider_id}/low-stock")
async def get_low_stock_products(
    provider_id: int,
    threshold: int = Query(10, ge=0),
    db: Session = Depends(get_db)
):
    """Obtener productos con stock bajo"""
    product_service = ProductService(db)
    products = product_service.get_low_stock_products(provider_id, threshold)
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "stock_quantity": p.stock_quantity,
            "sku": p.sku
        } for p in products
    ]
