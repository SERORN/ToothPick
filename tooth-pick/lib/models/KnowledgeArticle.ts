import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeArticle extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  role: 'patient' | 'dentist' | 'distributor' | 'admin' | 'all';
  category: string;
  tags: string[];
  isFeatured: boolean;
  isPublished: boolean;
  author: mongoose.Types.ObjectId;
  views: number;
  helpful: number;
  notHelpful: number;
  lastViewedAt?: Date;
  seoTitle?: string;
  seoDescription?: string;
  relatedArticles: mongoose.Types.ObjectId[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual methods
  helpfulScore: number;
  readTime: number;
}

const KnowledgeArticleSchema: Schema = new Schema<IKnowledgeArticle>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9-]+$/
    },
    content: {
      type: String,
      required: true
    },
    excerpt: {
      type: String,
      maxlength: 300,
      trim: true
    },
    role: {
      type: String,
      enum: ['patient', 'dentist', 'distributor', 'admin', 'all'],
      default: 'all',
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    isFeatured: {
      type: Boolean,
      default: false
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    helpful: {
      type: Number,
      default: 0,
      min: 0
    },
    notHelpful: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewedAt: {
      type: Date
    },
    seoTitle: {
      type: String,
      maxlength: 60,
      trim: true
    },
    seoDescription: {
      type: String,
      maxlength: 160,
      trim: true
    },
    relatedArticles: [{
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeArticle'
    }],
    attachments: [{
      type: String // URLs de archivos adjuntos
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para búsqueda y rendimiento
KnowledgeArticleSchema.index({ 
  title: 'text', 
  content: 'text', 
  tags: 'text',
  excerpt: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    excerpt: 3,
    content: 1
  },
  name: 'article_text_index'
});

KnowledgeArticleSchema.index({ slug: 1 }, { unique: true });
KnowledgeArticleSchema.index({ role: 1, category: 1, isPublished: 1 });
KnowledgeArticleSchema.index({ isFeatured: 1, isPublished: 1 });
KnowledgeArticleSchema.index({ views: -1, isPublished: 1 });
KnowledgeArticleSchema.index({ helpful: -1, isPublished: 1 });
KnowledgeArticleSchema.index({ createdAt: -1 });
KnowledgeArticleSchema.index({ tags: 1 });

// Virtual para calcular score de utilidad
KnowledgeArticleSchema.virtual('helpfulScore').get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.helpful / total) * 100);
});

// Virtual para calcular tiempo de lectura estimado (palabras por minuto)
KnowledgeArticleSchema.virtual('readTime').get(function() {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(minutes, 1);
});

// Pre-save middleware para generar excerpt si no existe
KnowledgeArticleSchema.pre('save', function(next) {
  if (!this.excerpt && this.content) {
    // Extraer texto plano del contenido (remover markdown/HTML básico)
    const plainText = this.content
      .replace(/[#*_`]/g, '') // Remover markdown básico
      .replace(/<[^>]*>/g, '') // Remover HTML
      .trim();
    
    this.excerpt = plainText.length > 250 
      ? plainText.substring(0, 247) + '...'
      : plainText;
  }
  
  // Generar SEO fields si no existen
  if (!this.seoTitle) {
    this.seoTitle = this.title.length > 60 
      ? this.title.substring(0, 57) + '...'
      : this.title;
  }
  
  if (!this.seoDescription) {
    this.seoDescription = this.excerpt || '';
  }
  
  next();
});

// Método para incrementar vistas
KnowledgeArticleSchema.methods.incrementViews = async function() {
  this.views += 1;
  this.lastViewedAt = new Date();
  return this.save();
};

// Método para marcar como útil/no útil
KnowledgeArticleSchema.methods.markHelpful = async function(isHelpful: boolean) {
  if (isHelpful) {
    this.helpful += 1;
  } else {
    this.notHelpful += 1;
  }
  return this.save();
};

// Método para generar URL del artículo
KnowledgeArticleSchema.methods.getUrl = function() {
  return `/help/articles/${this.slug}`;
};

// Método estático para búsqueda avanzada
KnowledgeArticleSchema.statics.searchArticles = async function(
  query: string,
  filters: {
    role?: string;
    category?: string;
    tags?: string[];
    limit?: number;
    skip?: number;
  } = {}
) {
  const searchConditions: any = {
    isPublished: true
  };

  // Agregar filtros
  if (filters.role && filters.role !== 'all') {
    searchConditions.$or = [
      { role: filters.role },
      { role: 'all' }
    ];
  }

  if (filters.category) {
    searchConditions.category = filters.category;
  }

  if (filters.tags && filters.tags.length > 0) {
    searchConditions.tags = { $in: filters.tags };
  }

  // Realizar búsqueda por texto si hay query
  if (query) {
    searchConditions.$text = { $search: query };
  }

  const articles = await this.find(searchConditions)
    .populate('author', 'name email')
    .sort(query ? { score: { $meta: 'textScore' } } : { views: -1, helpful: -1 })
    .limit(filters.limit || 20)
    .skip(filters.skip || 0)
    .lean();

  return articles;
};

// Método estático para obtener artículos relacionados
KnowledgeArticleSchema.statics.getRelatedArticles = async function(
  articleId: string,
  category: string,
  tags: string[],
  limit: number = 5
) {
  return this.find({
    _id: { $ne: articleId },
    isPublished: true,
    $or: [
      { category: category },
      { tags: { $in: tags } }
    ]
  })
  .populate('author', 'name')
  .sort({ views: -1, helpful: -1 })
  .limit(limit)
  .lean();
};

// Método estático para obtener artículos más populares
KnowledgeArticleSchema.statics.getPopularArticles = async function(
  role?: string,
  limit: number = 10
) {
  const conditions: any = { isPublished: true };
  
  if (role && role !== 'all') {
    conditions.$or = [
      { role: role },
      { role: 'all' }
    ];
  }

  return this.find(conditions)
    .populate('author', 'name')
    .sort({ views: -1, helpful: -1 })
    .limit(limit)
    .lean();
};

// Método estático para obtener artículos destacados
KnowledgeArticleSchema.statics.getFeaturedArticles = async function(
  role?: string,
  limit: number = 6
) {
  const conditions: any = { 
    isPublished: true, 
    isFeatured: true 
  };
  
  if (role && role !== 'all') {
    conditions.$or = [
      { role: role },
      { role: 'all' }
    ];
  }

  return this.find(conditions)
    .populate('author', 'name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Método estático para obtener sugerencias basadas en categoría de ticket
KnowledgeArticleSchema.statics.getSuggestionsForTicketCategory = async function(
  ticketCategory: string,
  userRole: string = 'all',
  limit: number = 5
) {
  // Mapeo de categorías de tickets a categorías de artículos
  const categoryMapping: Record<string, string[]> = {
    'facturacion': ['Facturación', 'CFDI', 'Pagos', 'Suscripciones'],
    'envios': ['Envíos', 'Logística', 'Tracking', 'Entregas'],
    'soporte_tecnico': ['Técnico', 'Errores', 'Configuración', 'Tutorial'],
    'toothpay': ['Pagos', 'ToothPay', 'Transacciones', 'Tarjetas'],
    'marketplace': ['Marketplace', 'Productos', 'Ventas', 'Comisiones'],
    'suscripciones': ['Suscripciones', 'Planes', 'Facturación', 'Upgrades'],
    'otros': ['General', 'FAQ', 'Ayuda']
  };

  const relatedCategories = categoryMapping[ticketCategory] || ['General'];
  
  const conditions: any = {
    isPublished: true,
    $or: [
      { category: { $in: relatedCategories } },
      { tags: { $in: relatedCategories.map(c => c.toLowerCase()) } }
    ]
  };

  if (userRole && userRole !== 'all') {
    conditions.$and = [
      {
        $or: [
          { role: userRole },
          { role: 'all' }
        ]
      }
    ];
  }

  return this.find(conditions)
    .populate('author', 'name')
    .sort({ helpful: -1, views: -1 })
    .limit(limit)
    .lean();
};

// Método estático para obtener estadísticas
KnowledgeArticleSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalArticles: { $sum: 1 },
        publishedArticles: {
          $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
        },
        totalViews: { $sum: '$views' },
        totalHelpful: { $sum: '$helpful' },
        totalNotHelpful: { $sum: '$notHelpful' },
        avgHelpfulScore: {
          $avg: {
            $cond: [
              { $gt: [{ $add: ['$helpful', '$notHelpful'] }, 0] },
              { 
                $multiply: [
                  { $divide: ['$helpful', { $add: ['$helpful', '$notHelpful'] }] },
                  100
                ]
              },
              0
            ]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalArticles: 0,
    publishedArticles: 0,
    totalViews: 0,
    totalHelpful: 0,
    totalNotHelpful: 0,
    avgHelpfulScore: 0
  };
};

export default mongoose.models.KnowledgeArticle || 
  mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
