import FAQ, { IFAQ } from '@/lib/models/FAQ';
import connectDB from '@/lib/db';

export interface CreateFAQData {
  question: string;
  answer: string;
  category: string;
  rolesVisibleTo: ('provider' | 'distributor' | 'clinic' | 'admin' | 'all')[];
  tags?: string[];
  order?: number;
  isPublished?: boolean;
  lastUpdatedBy: string;
}

export interface UpdateFAQData {
  question?: string;
  answer?: string;
  category?: string;
  rolesVisibleTo?: ('provider' | 'distributor' | 'clinic' | 'admin' | 'all')[];
  tags?: string[];
  order?: number;
  isPublished?: boolean;
  lastUpdatedBy: string;
}

export interface FAQFilters {
  category?: string;
  role?: string;
  tags?: string[];
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'order' | 'category' | 'viewCount' | 'createdAt' | 'isHelpful';
  sortOrder?: 'asc' | 'desc';
}

class FAQService {
  
  // Crear una nueva FAQ
  static async createFAQ(data: CreateFAQData): Promise<IFAQ> {
    await connectDB();
    
    const faq = new FAQ({
      ...data,
      viewCount: 0,
      isHelpful: 0,
      isNotHelpful: 0,
      order: data.order || 0,
      isPublished: data.isPublished !== false // Por defecto true
    });
    
    const savedFAQ = await faq.save();
    return savedFAQ;
  }
  
  // Obtener FAQs con filtros
  static async getFAQs(filters: FAQFilters = {}) {
    await connectDB();
    
    const {
      page = 1,
      limit = 50,
      sortBy = 'order',
      sortOrder = 'asc',
      role,
      ...queryFilters
    } = filters;
    
    // Construir query base
    const query: any = {};
    
    if (queryFilters.category) query.category = queryFilters.category;
    if (queryFilters.isPublished !== undefined) query.isPublished = queryFilters.isPublished;
    if (queryFilters.tags && queryFilters.tags.length > 0) {
      query.tags = { $in: queryFilters.tags };
    }
    
    // Filtro por rol
    if (role && role !== 'all') {
      query.$or = [
        { rolesVisibleTo: 'all' },
        { rolesVisibleTo: role }
      ];
    }
    
    // Solo mostrar publicadas si no se especifica lo contrario
    if (queryFilters.isPublished === undefined) {
      query.isPublished = true;
    }
    
    // Búsqueda de texto
    let faqs;
    if (queryFilters.search) {
      faqs = await (FAQ as any).searchFAQs(queryFilters.search, role);
      
      // Aplicar filtros adicionales
      if (Object.keys(query).length > 0) {
        const ids = faqs.map((faq: any) => faq._id);
        query._id = { $in: ids };
        faqs = await FAQ.find(query);
      }
    } else {
      // Consulta normal con ordenamiento
      const sortOption: any = {};
      sortOption[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      faqs = await FAQ.find(query)
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(limit);
    }
    
    const total = await FAQ.countDocuments(query);
    
    return {
      faqs,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: faqs.length,
        totalDocuments: total
      }
    };
  }
  
  // Obtener FAQ por ID
  static async getFAQById(faqId: string, incrementView = false): Promise<IFAQ | null> {
    await connectDB();
    
    const faq = await FAQ.findById(faqId);
    
    if (!faq) return null;
    
    // Incrementar contador de vistas si se solicita
    if (incrementView) {
      await faq.incrementView();
      faq.viewCount += 1; // Actualizar en memoria para retornar el valor actualizado
    }
    
    return faq;
  }
  
  // Actualizar FAQ
  static async updateFAQ(faqId: string, data: UpdateFAQData): Promise<IFAQ | null> {
    await connectDB();
    
    const faq = await FAQ.findByIdAndUpdate(
      faqId,
      { ...data },
      { new: true }
    );
    
    return faq;
  }
  
  // Eliminar FAQ
  static async deleteFAQ(faqId: string): Promise<boolean> {
    await connectDB();
    
    const result = await FAQ.findByIdAndDelete(faqId);
    return !!result;
  }
  
  // Obtener FAQs por categoría
  static async getFAQsByCategory(category: string, role?: string): Promise<IFAQ[]> {
    await connectDB();
    
    return await (FAQ as any).getByRole(role || 'all', category);
  }
  
  // Obtener todas las categorías
  static async getCategories(role?: string) {
    await connectDB();
    
    return await (FAQ as any).getCategories(role);
  }
  
  // Obtener FAQs populares
  static async getPopularFAQs(role?: string, limit = 10): Promise<IFAQ[]> {
    await connectDB();
    
    return await (FAQ as any).getPopular(role, limit);
  }
  
  // Buscar FAQs
  static async searchFAQs(searchTerm: string, role?: string): Promise<IFAQ[]> {
    await connectDB();
    
    return await (FAQ as any).searchFAQs(searchTerm, role);
  }
  
  // Votar como útil/no útil
  static async voteFAQ(faqId: string, isHelpful: boolean): Promise<IFAQ | null> {
    await connectDB();
    
    const faq = await FAQ.findById(faqId);
    if (!faq) return null;
    
    await faq.voteHelpful(isHelpful);
    
    // Actualizar contadores en memoria
    if (isHelpful) {
      faq.isHelpful += 1;
    } else {
      faq.isNotHelpful += 1;
    }
    
    return faq;
  }
  
  // Obtener estadísticas de FAQs
  static async getStatistics() {
    await connectDB();
    
    const [generalStats, categoryStats] = await Promise.all([
      (FAQ as any).getStatistics(),
      (FAQ as any).getCategories()
    ]);
    
    const popularFAQs = await (FAQ as any).getPopular('all', 5);
    
    return {
      general: generalStats[0] || {},
      categories: categoryStats,
      popular: popularFAQs
    };
  }
  
  // Reordenar FAQs en una categoría
  static async reorderFAQs(category: string, faqOrders: { id: string; order: number }[]): Promise<boolean> {
    await connectDB();
    
    try {
      const updatePromises = faqOrders.map(({ id, order }) =>
        FAQ.findByIdAndUpdate(id, { order })
      );
      
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('Error reordering FAQs:', error);
      return false;
    }
  }
  
  // Duplicar FAQ
  static async duplicateFAQ(faqId: string, lastUpdatedBy: string): Promise<IFAQ | null> {
    await connectDB();
    
    const originalFAQ = await FAQ.findById(faqId);
    if (!originalFAQ) return null;
    
    const duplicatedFAQ = new FAQ({
      question: `${originalFAQ.question} (Copia)`,
      answer: originalFAQ.answer,
      category: originalFAQ.category,
      rolesVisibleTo: originalFAQ.rolesVisibleTo,
      tags: originalFAQ.tags,
      order: originalFAQ.order + 1,
      isPublished: false, // Las copias empiezan como no publicadas
      lastUpdatedBy,
      viewCount: 0,
      isHelpful: 0,
      isNotHelpful: 0
    });
    
    const savedFAQ = await duplicatedFAQ.save();
    return savedFAQ;
  }
  
  // Obtener FAQs relacionadas (por tags similares)
  static async getRelatedFAQs(faqId: string, role?: string, limit = 5): Promise<IFAQ[]> {
    await connectDB();
    
    const faq = await FAQ.findById(faqId);
    if (!faq || !faq.tags.length) return [];
    
    const query: any = {
      _id: { $ne: faqId },
      isPublished: true,
      tags: { $in: faq.tags }
    };
    
    if (role && role !== 'all') {
      query.$or = [
        { rolesVisibleTo: 'all' },
        { rolesVisibleTo: role }
      ];
    }
    
    return await FAQ.find(query)
      .sort({ viewCount: -1, isHelpful: -1 })
      .limit(limit);
  }
  
  // Obtener métricas de engagement
  static async getEngagementMetrics(startDate?: Date, endDate?: Date) {
    await connectDB();
    
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }
    
    const metrics = await FAQ.aggregate([
      { $match: { isPublished: true, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalFAQs: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalHelpfulVotes: { $sum: '$isHelpful' },
          totalNotHelpfulVotes: { $sum: '$isNotHelpful' },
          avgViews: { $avg: '$viewCount' },
          avgHelpfulRatio: {
            $avg: {
              $cond: [
                { $gt: [{ $add: ['$isHelpful', '$isNotHelpful'] }, 0] },
                { $divide: ['$isHelpful', { $add: ['$isHelpful', '$isNotHelpful'] }] },
                0
              ]
            }
          },
          topCategories: {
            $push: {
              category: '$category',
              views: '$viewCount'
            }
          }
        }
      }
    ]);
    
    return metrics[0] || {};
  }
}

export default FAQService;
