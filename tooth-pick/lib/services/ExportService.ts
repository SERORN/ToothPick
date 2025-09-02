import ExportRequest from '../models/ExportRequest';
import { createObjectCsvWriter } from 'csv-writer';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

export default class ExportService {
  // 🧾 Exportar colección a CSV
  static async exportCollectionToCSV(collectionName: string, filters: any, requestedBy: string): Promise<any> {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const collection = mongoose.connection.collection(collectionName);
    const data = await collection.find(filters).toArray();
    const fileName = `${collectionName}-${Date.now()}.csv`;
    const filePath = path.join(BACKUP_DIR, fileName);
    const headers = Object.keys(data[0] || {}).map(key => ({ id: key, title: key }));
    const csvWriter = createObjectCsvWriter({ path: filePath, header: headers });
    await csvWriter.writeRecords(data);
    const sizeMB = Math.round(fs.statSync(filePath).size / 1024 / 1024 * 100) / 100;
    const exportLog = await ExportRequest.create({
      requestedAt: new Date(),
      userId: new mongoose.Types.ObjectId(requestedBy),
      format: 'csv',
      collections: [collectionName],
      status: 'success',
      filePath,
      sizeMB,
      resultMessage: 'Exportación CSV completada'
    });
    return exportLog;
  }

  // 📦 Exportar múltiples colecciones a JSON (en zip)
  static async exportMultipleToJSONZip(collections: string[], requestedBy: string): Promise<any> {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
    const zipName = `export-${Date.now()}.zip`;
    const zipPath = path.join(BACKUP_DIR, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    for (const name of collections) {
      const collection = mongoose.connection.collection(name);
      const docs = await collection.find({}).toArray();
      archive.append(JSON.stringify(docs, null, 2), { name: `${name}.json` });
    }
    await archive.finalize();
    const sizeMB = Math.round(fs.statSync(zipPath).size / 1024 / 1024 * 100) / 100;
    const exportLog = await ExportRequest.create({
      requestedAt: new Date(),
      userId: new mongoose.Types.ObjectId(requestedBy),
      format: 'zip',
      collections,
      status: 'success',
      filePath: zipPath,
      sizeMB,
      resultMessage: 'Exportación ZIP completada'
    });
    return exportLog;
  }

  // 🧾 Historial de exportaciones
  static async getExportHistory(limit = 20): Promise<any[]> {
    return ExportRequest.find().sort({ requestedAt: -1 }).limit(limit).lean();
  }
}
