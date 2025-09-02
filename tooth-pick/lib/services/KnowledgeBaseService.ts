import KnowledgeArticle from '@/lib/models/KnowledgeArticle';
import User from '@/lib/models/User';
import connectDB from '@/lib/db';

class KnowledgeBaseService {
  
  /**
   * Buscar artículos con filtros avanzados
   */
  static async searchArticles(
    query: string = '',
    filters: {
      role?: string;
      category?: string;
      tags?: string[];
      page?: number;
      limit?: number;
      sortBy?: 'relevance' | 'popular' | 'recent' | 'helpful';
    } = {}
  ) {
    await connectDB();
    
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const searchConditions: any = {
        isPublished: true
      };

      // Filtros de rol
      if (filters.role && filters.role !== 'all') {
        searchConditions.$or = [
          { role: filters.role },
          { role: 'all' }
        ];
      }

      // Filtros de categoría
      if (filters.category) {
        searchConditions.category = filters.category;
      }

      // Filtros de tags
      if (filters.tags && filters.tags.length > 0) {
        searchConditions.tags = { $in: filters.tags };
      }

      // Búsqueda por texto
      if (query.trim()) {
        searchConditions.$text = { $search: query };
      }

      // Definir ordenamiento
      let sortOptions: any = {};
      switch (filters.sortBy) {
        case 'relevance':
          sortOptions = query ? { score: { $meta: 'textScore' } } : { views: -1 };
          break;
        case 'popular':
          sortOptions = { views: -1, helpful: -1 };
          break;
        case 'recent':
          sortOptions = { createdAt: -1 };
          break;
        case 'helpful':
          sortOptions = { helpful: -1, views: -1 };
          break;
        default:
          sortOptions = { views: -1, helpful: -1 };
      }

      // Ejecutar búsqueda
      const articles = await KnowledgeArticle.find(searchConditions)
        .populate('author', 'name email')
        .sort(sortOptions)
        .limit(limit)
        .skip(skip)
        .lean();

      // Contar total para paginación
      const total = await KnowledgeArticle.countDocuments(searchConditions);

      return {
        articles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error buscando artículos:', error);
      throw error;
    }
  }

  /**
   * Obtener artículo por slug
   */
  static async getArticleBySlug(slug: string, userRole?: string) {
    await connectDB();
    
    try {
      const conditions: any = { 
        slug, 
        isPublished: true 
      };

      // Verificar permisos de rol
      if (userRole && userRole !== 'admin') {
        conditions.$or = [
          { role: userRole },
          { role: 'all' }
        ];
      }

      const article = await KnowledgeArticle.findOne(conditions)
        .populate('author', 'name email')
        .populate('relatedArticles', 'title slug excerpt category role');

      if (!article) {
        return null;
      }

      // Incrementar vistas
      await article.incrementViews();

      // Obtener artículos relacionados si no están definidos explícitamente
      let relatedArticles = article.relatedArticles;
      if (!relatedArticles || relatedArticles.length === 0) {
        relatedArticles = await KnowledgeArticle.getRelatedArticles(
          article._id,
          article.category,
          article.tags,
          5
        );
      }

      return {
        ...article.toObject(),
        relatedArticles
      };

    } catch (error) {
      console.error('Error obteniendo artículo:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo artículo
   */
  static async createArticle(articleData: any, authorId: string) {
    await connectDB();
    
    try {
      // Generar slug único
      const baseSlug = this.generateSlug(articleData.title);
      const slug = await this.generateUniqueSlug(baseSlug);

      const article = new KnowledgeArticle({
        ...articleData,
        slug,
        author: authorId
      });

      await article.save();
      
      return article.populate('author', 'name email');

    } catch (error) {
      console.error('Error creando artículo:', error);
      throw error;
    }
  }

  /**
   * Actualizar artículo
   */
  static async updateArticle(articleId: string, updateData: any) {
    await connectDB();
    
    try {
      // Si se actualiza el título, regenerar slug
      if (updateData.title) {
        const baseSlug = this.generateSlug(updateData.title);
        const currentArticle = await KnowledgeArticle.findById(articleId);
        
        if (currentArticle && currentArticle.slug !== baseSlug) {
          updateData.slug = await this.generateUniqueSlug(baseSlug, articleId);
        }
      }

      const article = await KnowledgeArticle.findByIdAndUpdate(
        articleId,
        updateData,
        { new: true }
      ).populate('author', 'name email');

      return article;

    } catch (error) {
      console.error('Error actualizando artículo:', error);
      throw error;
    }
  }

  /**
   * Eliminar artículo
   */
  static async deleteArticle(articleId: string) {
    await connectDB();
    
    try {
      await KnowledgeArticle.findByIdAndDelete(articleId);
      return true;

    } catch (error) {
      console.error('Error eliminando artículo:', error);
      throw error;
    }
  }

  /**
   * Marcar artículo como útil/no útil
   */
  static async markArticleHelpful(articleId: string, isHelpful: boolean) {
    await connectDB();
    
    try {
      const article = await KnowledgeArticle.findById(articleId);
      if (!article) {
        throw new Error('Artículo no encontrado');
      }

      await article.markHelpful(isHelpful);
      
      return {
        helpful: article.helpful,
        notHelpful: article.notHelpful,
        helpfulScore: article.helpfulScore
      };

    } catch (error) {
      console.error('Error marcando artículo como útil:', error);
      throw error;
    }
  }

  /**
   * Obtener artículos destacados
   */
  static async getFeaturedArticles(userRole?: string, limit: number = 6) {
    await connectDB();
    
    try {
      return await KnowledgeArticle.getFeaturedArticles(userRole, limit);

    } catch (error) {
      console.error('Error obteniendo artículos destacados:', error);
      throw error;
    }
  }

  /**
   * Obtener artículos populares
   */
  static async getPopularArticles(userRole?: string, limit: number = 10) {
    await connectDB();
    
    try {
      return await KnowledgeArticle.getPopularArticles(userRole, limit);

    } catch (error) {
      console.error('Error obteniendo artículos populares:', error);
      throw error;
    }
  }

  /**
   * Obtener sugerencias para categoría de ticket
   */
  static async getSuggestionsForTicket(
    ticketCategory: string, 
    userRole: string = 'all', 
    limit: number = 5
  ) {
    await connectDB();
    
    try {
      return await KnowledgeArticle.getSuggestionsForTicketCategory(
        ticketCategory,
        userRole,
        limit
      );

    } catch (error) {
      console.error('Error obteniendo sugerencias para ticket:', error);
      throw error;
    }
  }

  /**
   * Obtener categorías disponibles
   */
  static async getCategories() {
    await connectDB();
    
    try {
      const categories = await KnowledgeArticle.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      return categories.map(cat => ({
        name: cat._id,
        count: cat.count
      }));

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      throw error;
    }
  }

  /**
   * Obtener tags más utilizados
   */
  static async getPopularTags(limit: number = 20) {
    await connectDB();
    
    try {
      const tags = await KnowledgeArticle.aggregate([
        { $match: { isPublished: true } },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);

      return tags.map(tag => ({
        name: tag._id,
        count: tag.count
      }));

    } catch (error) {
      console.error('Error obteniendo tags populares:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del knowledge base
   */
  static async getStatistics() {
    await connectDB();
    
    try {
      return await KnowledgeArticle.getStatistics();

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Búsqueda rápida para autocompletado
   */
  static async quickSearch(query: string, userRole?: string, limit: number = 5) {
    await connectDB();
    
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const conditions: any = {
        isPublished: true,
        $text: { $search: query }
      };

      if (userRole && userRole !== 'all') {
        conditions.$or = [
          { role: userRole },
          { role: 'all' }
        ];
      }

      const articles = await KnowledgeArticle.find(conditions)
        .select('title slug excerpt category role views helpful')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();

      return articles;

    } catch (error) {
      console.error('Error en búsqueda rápida:', error);
      throw error;
    }
  }

  /**
   * Generar slug desde título
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
      .trim()
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-'); // Múltiples guiones a uno solo
  }

  /**
   * Generar slug único
   */
  private static async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingArticle = await KnowledgeArticle.findOne({ 
        slug,
        ...(excludeId && { _id: { $ne: excludeId } })
      });

      if (!existingArticle) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
}

export default KnowledgeBaseService;
