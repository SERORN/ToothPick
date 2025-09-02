import mongoose, { Schema, Document } from 'mongoose';

export interface IFAQ extends Document {
  _id: string;
  question: string;
  answer: string;
  category: string;
  rolesVisibleTo: ('provider' | 'distributor' | 'clinic' | 'admin' | 'all')[];
  tags: string[];
  isPublished: boolean;
  order: number; // Para ordenar FAQs dentro de una categoría
  viewCount: number;
  isHelpful: number; // Contador de votos útiles
  isNotHelpful: number; // Contador de votos no útiles
  lastUpdatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FAQSchema = new Schema<IFAQ>({
  question: {
    type: String,
    required: true,
    maxlength: 300,
    trim: true,
    index: 'text'
  },
  answer: {
    type: String,
    required: true,
    maxlength: 3000,
    trim: true,
    index: 'text'
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  rolesVisibleTo: [{
    type: String,
    enum: ['provider', 'distributor', 'clinic', 'admin', 'all'],
    default: 'all'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isPublished: {
    type: Boolean,
    default: true,
    index: true
  },
  order: {
    type: Number,
    default: 0,
    index: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isHelpful: {
    type: Number,
    default: 0
  },
  isNotHelpful: {
    type: Number,
    default: 0
  },
  lastUpdatedBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'faqs'
});

// Índices compuestos
FAQSchema.index({ category: 1, order: 1, isPublished: 1 });
FAQSchema.index({ rolesVisibleTo: 1, isPublished: 1 });
FAQSchema.index({ tags: 1, isPublished: 1 });

// Índice de texto para búsqueda
FAQSchema.index({ 
  question: 'text', 
  answer: 'text', 
  tags: 'text' 
}, {
  weights: {
    question: 10,
    tags: 5,
    answer: 1
  }
});

// Métodos estáticos
FAQSchema.statics.getByRole = function(role: string, category?: string) {
  const query: any = {
    isPublished: true,
    $or: [
      { rolesVisibleTo: 'all' },
      { rolesVisibleTo: role }
    ]
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ category: 1, order: 1, createdAt: 1 })
    .select('-lastUpdatedBy');
};

FAQSchema.statics.searchFAQs = function(searchTerm: string, role?: string) {
  const query: any = {
    isPublished: true,
    $text: { $search: searchTerm }
  };
  
  if (role && role !== 'all') {
    query.$or = [
      { rolesVisibleTo: 'all' },
      { rolesVisibleTo: role }
    ];
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .select('-lastUpdatedBy');
};

FAQSchema.statics.getCategories = function(role?: string) {
  const matchQuery: any = { isPublished: true };
  
  if (role && role !== 'all') {
    matchQuery.$or = [
      { rolesVisibleTo: 'all' },
      { rolesVisibleTo: role }
    ];
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

FAQSchema.statics.getPopular = function(role?: string, limit = 10) {
  const query: any = { isPublished: true };
  
  if (role && role !== 'all') {
    query.$or = [
      { rolesVisibleTo: 'all' },
      { rolesVisibleTo: role }
    ];
  }
  
  return this.find(query)
    .sort({ viewCount: -1, isHelpful: -1 })
    .limit(limit)
    .select('-lastUpdatedBy');
};

FAQSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        published: { $sum: { $cond: ['$isPublished', 1, 0] } },
        totalViews: { $sum: '$viewCount' },
        totalHelpful: { $sum: '$isHelpful' },
        totalNotHelpful: { $sum: '$isNotHelpful' },
        avgHelpfulRatio: {
          $avg: {
            $cond: [
              { $gt: [{ $add: ['$isHelpful', '$isNotHelpful'] }, 0] },
              { $divide: ['$isHelpful', { $add: ['$isHelpful', '$isNotHelpful'] }] },
              0
            ]
          }
        }
      }
    }
  ]);
};

// Método para incrementar contador de vistas
FAQSchema.methods.incrementView = function() {
  return this.constructor.findByIdAndUpdate(
    this._id,
    { $inc: { viewCount: 1 } }
  );
};

// Método para votar como útil
FAQSchema.methods.voteHelpful = function(isHelpful: boolean) {
  const update = isHelpful
    ? { $inc: { isHelpful: 1 } }
    : { $inc: { isNotHelpful: 1 } };
    
  return this.constructor.findByIdAndUpdate(this._id, update);
};

// Exportar modelo
const FAQ = mongoose.models.FAQ || mongoose.model<IFAQ>('FAQ', FAQSchema);

export default FAQ;
