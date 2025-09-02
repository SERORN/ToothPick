// FASE 40: Modelo de historial de exportaciones
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ExportFormat = 'json' | 'csv' | 'zip';
export type ExportStatus = 'success' | 'failed' | 'in_progress';

export interface IExportRequest extends Document {
  requestedAt: Date;
  userId: mongoose.Types.ObjectId;
  collections: string[];
  format: ExportFormat;
  status: ExportStatus;
  filePath?: string;
  sizeMB?: number;
  resultMessage?: string;
}

const exportRequestSchema = new Schema<IExportRequest>({
  requestedAt: { type: Date, default: Date.now, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  collections: [{ type: String, required: true }],
  format: { type: String, enum: ['json', 'csv', 'zip'], required: true },
  status: { type: String, enum: ['success', 'failed', 'in_progress'], required: true },
  filePath: { type: String },
  sizeMB: { type: Number },
  resultMessage: { type: String }
}, {
  collection: 'export_requests',
  timestamps: true
});

const ExportRequest: Model<IExportRequest> = mongoose.models.ExportRequest || mongoose.model<IExportRequest>('ExportRequest', exportRequestSchema);
export default ExportRequest;
