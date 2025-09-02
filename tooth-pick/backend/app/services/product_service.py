from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from ..models.product import Product, ProductCategory, ProductStatus
from ..models.user import User
from ..database import get_db
import logging

logger = logging.getLogger(__name__)

class ProductService:
    """
    Servicio para gestión de productos del marketplace B2B dental
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_product(self, product_data: dict, provider_id: int) -> Product:
        """Crear nuevo producto"""
        try:
            product = Product(
                name=product_data["name"],
                description=product_data.get("description", ""),
                category=ProductCategory(product_data["category"]),
                price=product_data["price"],
                sku=product_data["sku"],
                brand=product_data.get("brand", ""),
                provider_id=provider_id,
                stock_quantity=product_data.get("stock_quantity", 0),
                min_order_quantity=product_data.get("min_order_quantity", 1),
                max_order_quantity=product_data.get("max_order_quantity"),
                specifications=product_data.get("specifications", {}),
                images=product_data.get("images", []),
                status=ProductStatus.ACTIVE
            )
            
            self.db.add(product)
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Producto creado: {product.name} (ID: {product.id})")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creando producto: {str(e)}")
            raise
    
    def get_product_by_id(self, product_id: int) -> Optional[Product]:
        """Obtener producto por ID"""
        return self.db.query(Product).filter(
            and_(
                Product.id == product_id,
                Product.status == ProductStatus.ACTIVE
            )
        ).first()
    
    def get_products_by_category(self, category: ProductCategory, limit: int = 50, offset: int = 0) -> List[Product]:
        """Obtener productos por categoría"""
        return self.db.query(Product).filter(
            and_(
                Product.category == category,
                Product.status == ProductStatus.ACTIVE,
                Product.stock_quantity > 0
            )
        ).offset(offset).limit(limit).all()
    
    def search_products(self, query: str, limit: int = 50, offset: int = 0) -> List[Product]:
        """Buscar productos por nombre, descripción o marca"""
        search_term = f"%{query}%"
        
        return self.db.query(Product).filter(
            and_(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.brand.ilike(search_term),
                    Product.sku.ilike(search_term)
                ),
                Product.status == ProductStatus.ACTIVE,
                Product.stock_quantity > 0
            )
        ).offset(offset).limit(limit).all()
    
    def get_products_by_provider(self, provider_id: int, limit: int = 100, offset: int = 0) -> List[Product]:
        """Obtener productos de un proveedor específico"""
        return self.db.query(Product).filter(
            and_(
                Product.provider_id == provider_id,
                Product.status == ProductStatus.ACTIVE
            )
        ).offset(offset).limit(limit).all()
    
    def update_product(self, product_id: int, product_data: dict, provider_id: int) -> Optional[Product]:
        """Actualizar producto existente"""
        try:
            product = self.db.query(Product).filter(
                and_(
                    Product.id == product_id,
                    Product.provider_id == provider_id
                )
            ).first()
            
            if not product:
                return None
            
            # Actualizar campos permitidos
            for field, value in product_data.items():
                if hasattr(product, field) and field not in ['id', 'provider_id', 'created_at']:
                    if field == 'category' and isinstance(value, str):
                        setattr(product, field, ProductCategory(value))
                    elif field == 'status' and isinstance(value, str):
                        setattr(product, field, ProductStatus(value))
                    else:
                        setattr(product, field, value)
            
            self.db.commit()
            self.db.refresh(product)
            
            logger.info(f"Producto actualizado: {product.name} (ID: {product.id})")
            return product
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error actualizando producto: {str(e)}")
            raise
    
    def update_stock(self, product_id: int, quantity_change: int) -> bool:
        """Actualizar stock de producto (positivo suma, negativo resta)"""
        try:
            product = self.db.query(Product).filter(Product.id == product_id).first()
            
            if not product:
                return False
            
            new_quantity = product.stock_quantity + quantity_change
            
            if new_quantity < 0:
                logger.warning(f"Stock insuficiente para producto {product_id}")
                return False
            
            product.stock_quantity = new_quantity
            
            # Marcar como out_of_stock si llega a 0
            if new_quantity == 0:
                product.status = ProductStatus.OUT_OF_STOCK
            elif product.status == ProductStatus.OUT_OF_STOCK and new_quantity > 0:
                product.status = ProductStatus.ACTIVE
            
            self.db.commit()
            
            logger.info(f"Stock actualizado para producto {product_id}: {new_quantity}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error actualizando stock: {str(e)}")
            return False
    
    def deactivate_product(self, product_id: int, provider_id: int) -> bool:
        """Desactivar producto (soft delete)"""
        try:
            product = self.db.query(Product).filter(
                and_(
                    Product.id == product_id,
                    Product.provider_id == provider_id
                )
            ).first()
            
            if not product:
                return False
            
            product.status = ProductStatus.INACTIVE
            self.db.commit()
            
            logger.info(f"Producto desactivado: {product.name} (ID: {product.id})")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error desactivando producto: {str(e)}")
            return False
    
    def get_low_stock_products(self, provider_id: int, threshold: int = 10) -> List[Product]:
        """Obtener productos con stock bajo"""
        return self.db.query(Product).filter(
            and_(
                Product.provider_id == provider_id,
                Product.stock_quantity <= threshold,
                Product.status == ProductStatus.ACTIVE
            )
        ).all()
    
    def get_featured_products(self, limit: int = 12) -> List[Product]:
        """Obtener productos destacados para homepage"""
        return self.db.query(Product).filter(
            and_(
                Product.status == ProductStatus.ACTIVE,
                Product.stock_quantity > 0,
                Product.featured == True
            )
        ).order_by(Product.created_at.desc()).limit(limit).all()
    
    def get_bestsellers(self, limit: int = 10) -> List[Product]:
        """Obtener productos más vendidos"""
        # Aquí harías join con tabla de orders para obtener los más vendidos
        # Por ahora simulamos con productos con más stock
        return self.db.query(Product).filter(
            and_(
                Product.status == ProductStatus.ACTIVE,
                Product.stock_quantity > 0
            )
        ).order_by(Product.stock_quantity.desc()).limit(limit).all()
    
    def get_categories_with_count(self) -> dict:
        """Obtener categorías con count de productos"""
        result = self.db.query(
            Product.category,
            func.count(Product.id).label('count')
        ).filter(
            and_(
                Product.status == ProductStatus.ACTIVE,
                Product.stock_quantity > 0
            )
        ).group_by(Product.category).all()
        
        return {category.value: count for category, count in result}
    
    def bulk_update_prices(self, provider_id: int, price_updates: List[dict]) -> int:
        """Actualización masiva de precios"""
        updated_count = 0
        
        try:
            for update in price_updates:
                product = self.db.query(Product).filter(
                    and_(
                        Product.sku == update['sku'],
                        Product.provider_id == provider_id
                    )
                ).first()
                
                if product:
                    product.price = update['new_price']
                    updated_count += 1
            
            self.db.commit()
            logger.info(f"Precios actualizados masivamente: {updated_count} productos")
            return updated_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error en actualización masiva: {str(e)}")
            return 0
