// FASE 40: Modelo de log de backups
import mongoose, { Schema, Document, Model } from 'mongoose';

export type BackupType = 'manual' | 'automatic';
export type BackupStatus = 'success' | 'failed' | 'in_progress';

export interface IBackupLog extends Document {
  createdAt: Date;
  type: BackupType;
  status: BackupStatus;
  sizeMB: number;
  userId?: mongoose.Types.ObjectId;
  notes?: string;
  filePath: string;
}

const backupLogSchema = new Schema<IBackupLog>({
  createdAt: { type: Date, default: Date.now, index: true },
  type: { type: String, enum: ['manual', 'automatic'], required: true },
  status: { type: String, enum: ['success', 'failed', 'in_progress'], required: true },
  sizeMB: { type: Number, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  filePath: { type: String, required: true }
}, {
  collection: 'backup_logs',
  timestamps: true
});

// TTL: borrar backups después de 30 días
backupLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

const BackupLog: Model<IBackupLog> = mongoose.models.BackupLog || mongoose.model<IBackupLog>('BackupLog', backupLogSchema);
export default BackupLog;
