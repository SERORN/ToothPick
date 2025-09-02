from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .user import Base

class ProductCategory(str, enum.Enum):
    HIGIENE_ORAL = "higiene-oral"
    BLANQUEAMIENTO = "blanqueamiento"
    ORTODONCIA = "ortodoncia"
    PROTESIS = "protesis"
    CIRUGIA = "cirugia"
    ENDODONCIA = "endodoncia"
    PERIODONCIA = "periodoncia"
    ESTETICA = "estetica"
    PREVENCION = "prevencion"
    DIAGNOSTICO = "diagnostico"
    INSTRUMENTAL = "instrumental"
    MATERIALES = "materiales"
    EQUIPOS = "equipos"

class ProductType(str, enum.Enum):
    PRODUCTO = "producto"
    SERVICIO = "servicio"
    KIT = "kit"
    TRATAMIENTO = "tratamiento"

class ProductStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OUT_OF_STOCK = "out_of_stock"
    DISCONTINUED = "discontinued"

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Información básica
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    short_description = Column(String(500))
    sku = Column(String(100), unique=True, index=True)
    
    # Pricing
    price = Column(Numeric(10, 2), nullable=False)
    cost_price = Column(Numeric(10, 2))  # Precio de costo
    discount_price = Column(Numeric(10, 2))
    currency = Column(String(3), default="MXN")
    
    # Categorización
    category = Column(Enum(ProductCategory), nullable=False)
    subcategory = Column(String(100))
    type = Column(Enum(ProductType), nullable=False)
    tags = Column(Text)  # JSON array como string
    
    # Inventario
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=5)
    max_stock = Column(Integer)
    unit_of_measure = Column(String(50), default="piece")
    
    # Características
    brand = Column(String(100))
    model = Column(String(100))
    manufacturer = Column(String(100))
    country_of_origin = Column(String(100))
    warranty_months = Column(Integer)
    
    # Multimedia
    main_image = Column(String(500))
    images = Column(Text)  # JSON array de URLs
    video_url = Column(String(500))
    documents = Column(Text)  # JSON array de documentos
    
    # SEO y Marketing
    meta_title = Column(String(200))
    meta_description = Column(String(500))
    featured = Column(Boolean, default=False)
    on_sale = Column(Boolean, default=False)
    
    # Shipping
    weight_kg = Column(Numeric(8, 3))
    dimensions_cm = Column(String(50))  # "L x W x H"
    shipping_required = Column(Boolean, default=True)
    shipping_cost = Column(Numeric(8, 2))
    
    # Estado
    status = Column(Enum(ProductStatus), default=ProductStatus.ACTIVE)
    is_visible = Column(Boolean, default=True)
    requires_prescription = Column(Boolean, default=False)
    
    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Analytics
    views_count = Column(Integer, default=0)
    purchases_count = Column(Integer, default=0)
    total_revenue = Column(Numeric(12, 2), default=0)
    average_rating = Column(Numeric(3, 2))
    rating_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True))
    discontinued_at = Column(DateTime(timezone=True))
    
    # Relaciones
    owner = relationship("User", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    
    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price})>"
