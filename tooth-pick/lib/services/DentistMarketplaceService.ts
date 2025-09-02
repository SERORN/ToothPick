import DentistProduct from '../models/DentistProduct';
import User from '../models/User';
import ClinicSubscription from '../models/ClinicSubscription';
import Order from '../models/Order';
import { NotificationService } from './NotificationService';
import { EmailService } from './EmailService';
import connectDB from '../db';

export class DentistMarketplaceService {
  
  /**
   * Verificar si un dentista puede crear productos según su plan
   */
  static async canCreateProduct(dentistId: string): Promise<{ 
    canCreate: boolean; 
    limit?: number; 
    current?: number; 
    reason?: string; 
  }> {
    await connectDB();
    
    try {
      // Obtener suscripción del dentista
      const subscription = await ClinicSubscription.findOne({ 
        dentistId, 
        status: 'active' 
      });
      
      if (!subscription) {
        return { 
          canCreate: false, 
          reason: 'No tienes una suscripción activa' 
        };
      }
      
      // Contar productos actuales
      const currentProducts = await DentistProduct.countDocuments({ 
        owner: dentistId 
      });
      
      // Verificar límites por plan
      switch (subscription.plan) {
        case 'free':
          const freeLimit = 3;
          return {
            canCreate: currentProducts < freeLimit,
            limit: freeLimit,
            current: currentProducts,
            reason: currentProducts >= freeLimit ? 
              'Límite de productos alcanzado. Actualiza a Pro para productos ilimitados.' : 
              undefined
          };
          
        case 'pro':
        case 'elite':
          return {
            canCreate: true,
            current: currentProducts
          };
          
        default:
          return { 
            canCreate: false, 
            reason: 'Plan no válido' 
          };
      }
      
    } catch (error) {
      console.error('Error verificando límites de productos:', error);
      return { 
        canCreate: false, 
        reason: 'Error interno del servidor' 
      };
    }
  }
  
  /**
   * Crear un nuevo producto para dentista
   */
  static async createProduct(dentistId: string, productData: any) {
    await connectDB();
    
    try {
      // Verificar permisos
      const canCreate = await this.canCreateProduct(dentistId);
      if (!canCreate.canCreate) {
        throw new Error(canCreate.reason || 'No puedes crear más productos');
      }
      
      // Verificar que el dentista existe
      const dentist = await User.findById(dentistId);
      if (!dentist || dentist.role !== 'dentist') {
        throw new Error('Dentista no encontrado');
      }
      
      // Crear producto
      const product = new DentistProduct({
        ...productData,
        owner: dentistId
      });
      
      await product.save();
      
      // Poblar datos del dentista
      await product.populate('dentist', 'name clinicName profilePicture');
      
      return product;
      
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar producto de dentista
   */
  static async updateProduct(dentistId: string, productId: string, updateData: any) {
    await connectDB();
    
    try {
      const product = await DentistProduct.findOne({
        _id: productId,
        owner: dentistId
      });
      
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      
      // Actualizar campos permitidos
      const allowedFields = [
        'name', 'description', 'price', 'image', 'images', 'stock',
        'category', 'visible', 'tags', 'active', 'shippingAvailable',
        'shippingCost', 'pickupOnly', 'customMessage', 'features', 'duration'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          product[field] = updateData[field];
        }
      });
      
      await product.save();
      await product.populate('dentist', 'name clinicName profilePicture');
      
      return product;
      
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  }
  
  /**
   * Eliminar producto de dentista
   */
  static async deleteProduct(dentistId: string, productId: string) {
    await connectDB();
    
    try {
      const product = await DentistProduct.findOneAndDelete({
        _id: productId,
        owner: dentistId
      });
      
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      
      return { success: true, message: 'Producto eliminado exitosamente' };
      
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }
  
  /**
   * Procesar compra de producto de dentista
   */
  static async processProductPurchase(
    customerId: string,
    productId: string,
    quantity: number,
    shippingInfo?: any
  ) {
    await connectDB();
    
    try {
      // Obtener producto
      const product = await DentistProduct.findById(productId)
        .populate('dentist', 'name clinicName email phone');
      
      if (!product) {
        throw new Error('Producto no encontrado');
      }
      
      if (!product.canBePurchased(quantity)) {
        throw new Error('Producto no disponible en la cantidad solicitada');
      }
      
      // Obtener cliente
      const customer = await User.findById(customerId);
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }
      
      // Calcular precios
      const subtotal = product.price * quantity;
      
      // Calcular comisión según plan del dentista
      const dentistSubscription = await ClinicSubscription.findOne({
        dentistId: product.owner,
        status: 'active'
      });
      
      let platformFeeRate = 0.085; // 8.5% por defecto (plan free)
      if (dentistSubscription?.plan === 'pro' || dentistSubscription?.plan === 'elite') {
        platformFeeRate = 0; // Sin comisión para Pro/Elite
      }
      
      const platformFee = subtotal * platformFeeRate;
      const total = subtotal + (product.shippingCost || 0);
      
      // Crear orden
      const order = new Order({
        orderNumber: `DMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        buyerId: customerId,
        sellerId: product.owner,
        orderType: 'dentist_marketplace',
        items: [{
          productId: productId,
          name: product.name,
          brand: product.dentist.clinicName || product.dentist.name,
          price: product.price,
          quantity: quantity,
          subtotal: subtotal,
          currency: 'MXN',
          image: product.image,
          provider: {
            id: product.owner,
            name: product.dentist.name
          },
          productType: 'dentist_product',
          dentistProductRef: productId,
          isDentistService: product.type === 'servicio',
          serviceDuration: product.duration,
          appointmentRequired: product.type === 'servicio' || product.type === 'tratamiento'
        }],
        subtotal: subtotal,
        platformFee: platformFee,
        total: total,
        currency: 'MXN',
        shipping: shippingInfo,
        shippingCost: product.shippingCost || 0
      });
      
      await order.save();
      
      // Actualizar estadísticas del producto
      await product.updateSales(quantity, subtotal);
      
      // Enviar notificaciones
      await this.sendPurchaseNotifications(order, product, customer);
      
      return {
        order,
        requiresPayment: true,
        paymentAmount: total,
        appointmentRequired: product.type === 'servicio' || product.type === 'tratamiento'
      };
      
    } catch (error) {
      console.error('Error procesando compra:', error);
      throw error;
    }
  }
  
  /**
   * Enviar notificaciones de compra
   */
  static async sendPurchaseNotifications(order: any, product: any, customer: any) {
    try {
      // Notificación al dentista
      await NotificationService.createNotification({
        userId: product.owner,
        type: 'marketplace_sale',
        title: 'Nueva venta en tu marketplace',
        message: `${customer.name} compró ${product.name}`,
        data: {
          orderId: order._id,
          productId: product._id,
          customerName: customer.name,
          amount: order.total
        }
      });
      
      // Email al dentista
      if (product.dentist.email) {
        await EmailService.sendEmail({
          to: product.dentist.email,
          subject: `Nueva venta: ${product.name}`,
          template: 'dentist-marketplace-sale',
          data: {
            dentistName: product.dentist.name,
            productName: product.name,
            customerName: customer.name,
            quantity: order.items[0].quantity,
            total: order.total,
            orderNumber: order.orderNumber
          }
        });
      }
      
      // Notificación al cliente
      await NotificationService.createNotification({
        userId: customer._id,
        type: 'purchase_confirmation',
        title: 'Compra confirmada',
        message: `Tu compra de ${product.name} ha sido confirmada`,
        data: {
          orderId: order._id,
          productName: product.name,
          dentistName: product.dentist.name
        }
      });
      
      // Email al cliente
      await EmailService.sendEmail({
        to: customer.email,
        subject: `Compra confirmada - ${product.name}`,
        template: 'customer-purchase-confirmation',
        data: {
          customerName: customer.name,
          productName: product.name,
          dentistName: product.dentist.name,
          total: order.total,
          orderNumber: order.orderNumber,
          appointmentRequired: product.type === 'servicio' || product.type === 'tratamiento'
        }
      });
      
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
      // No lanzar error para no afectar la compra
    }
  }
  
  /**
   * Obtener productos públicos con filtros
   */
  static async getPublicProducts(filters: {
    dentistId?: string;
    category?: string;
    type?: string;
    city?: string;
    state?: string;
    search?: string;
    limit?: number;
    page?: number;
  } = {}) {
    await connectDB();
    
    try {
      const {
        dentistId,
        category,
        type,
        city,
        state,
        search,
        limit = 20,
        page = 1
      } = filters;
      
      if (search) {
        return await DentistProduct.searchProducts(search, {
          ...(category && { category }),
          ...(type && { type })
        }, limit);
      }
      
      let products = await DentistProduct.getPublicProducts(
        dentistId,
        category,
        limit
      );
      
      // Filtros adicionales
      if (type) {
        products = products.filter(p => p.type === type);
      }
      
      if (city || state) {
        products = products.filter(p => {
          if (city && p.dentist.city !== city) return false;
          if (state && p.dentist.state !== state) return false;
          return true;
        });
      }
      
      return products;
      
    } catch (error) {
      console.error('Error obteniendo productos públicos:', error);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas del marketplace para un dentista
   */
  static async getDentistMarketplaceStats(dentistId: string) {
    await connectDB();
    
    try {
      // Estadísticas de productos
      const productStats = await DentistProduct.getDentistStats(dentistId);
      
      // Estadísticas de ventas
      const salesStats = await Order.aggregate([
        {
          $match: {
            sellerId: new (require('mongoose')).Types.ObjectId(dentistId),
            orderType: 'dentist_marketplace',
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$subtotal' },
            totalCommissions: { $sum: '$platformFee' },
            avgOrderValue: { $avg: '$subtotal' }
          }
        }
      ]);
      
      const sales = salesStats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        totalCommissions: 0,
        avgOrderValue: 0
      };
      
      // Top productos
      const topProducts = await DentistProduct.getTopSellingProducts(dentistId, 5);
      
      return {
        products: productStats,
        sales,
        topProducts,
        netRevenue: sales.totalRevenue - sales.totalCommissions
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

export default DentistMarketplaceService;
