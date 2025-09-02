// FASE 40: Servicio de Backups
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import BackupLog, { IBackupLog } from '../models/BackupLog';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export default class BackupService {
  // 📦 1. Backup de colecciones seleccionadas
  static async createBackup(collections: string[], createdBy: string): Promise<IBackupLog> {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${collections.join('_')}_${createdBy}_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    let totalSize = 0;
    let backupData: Record<string, any> = {};

    for (const col of collections) {
      try {
        const model = mongoose.models[col] || mongoose.model(col);
        const docs = await model.find({}).lean();
        backupData[col] = docs;
        totalSize += Buffer.byteLength(JSON.stringify(docs), 'utf8');
      } catch (err) {
        backupData[col] = { error: 'No se pudo exportar esta colección.' };
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    const sizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100;

    // Registrar log
    const log = new BackupLog({
      createdAt: new Date(),
      type: 'manual',
      status: 'success',
      sizeMB,
      userId: new mongoose.Types.ObjectId(createdBy),
      notes: `Backup de colecciones: ${collections.join(', ')}`,
      filePath
    });
    await log.save();
    return log;
  }

  // 📂 2. Obtener historial de backups (últimos 20)
  static async getRecentBackups(): Promise<IBackupLog[]> {
    return BackupLog.find({}).sort({ createdAt: -1 }).limit(20).lean();
  }

  // 🔎 3. Obtener detalles de un backup
  static async getBackupById(id: string): Promise<IBackupLog | null> {
    return BackupLog.findById(id).lean();
  }
}
