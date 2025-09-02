import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

export interface UploadedDocument {
  frontUrl: string;
  backUrl: string;
  uploadedAt: Date;
}

export interface DocumentUrls {
  ine: UploadedDocument;
  rfc: {
    fileUrl: string;
    uploadedAt: Date;
  };
  constitutiveAct?: {
    fileUrl: string;
    uploadedAt: Date;
  };
  addressProof: {
    fileUrl: string;
    uploadedAt: Date;
  };
  additionalDocs?: Array<{
    name: string;
    fileUrl: string;
    uploadedAt: Date;
  }>;
}

export class DocumentUploadService {
  
  private static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf'
  ];
  
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  
  private static readonly UPLOAD_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'verification');
  
  /**
   * 📤 Subir documentos de verificación
   */
  static async uploadVerificationDocuments(
    userId: string,
    files: {
      ineFront: File;
      ineBack: File;
      rfc: File;
      constitutiveAct?: File;
      addressProof: File;
      additionalDocs?: File[];
    }
  ): Promise<DocumentUrls> {
    try {
      // Crear directorio del usuario si no existe
      const userUploadPath = join(this.UPLOAD_BASE_PATH, userId);
      await this.ensureDirectoryExists(userUploadPath);
      
      const uploadedAt = new Date();
      
      // Validar y subir INE (frente y reverso)
      await this.validateFile(files.ineFront);
      await this.validateFile(files.ineBack);
      
      const ineFrontUrl = await this.uploadFile(files.ineFront, userUploadPath, 'ine_front');
      const ineBackUrl = await this.uploadFile(files.ineBack, userUploadPath, 'ine_back');
      
      // Validar y subir RFC
      await this.validateFile(files.rfc);
      const rfcUrl = await this.uploadFile(files.rfc, userUploadPath, 'rfc');
      
      // Validar y subir comprobante de domicilio
      await this.validateFile(files.addressProof);
      const addressProofUrl = await this.uploadFile(files.addressProof, userUploadPath, 'address_proof');
      
      const documentUrls: DocumentUrls = {
        ine: {
          frontUrl: ineFrontUrl,
          backUrl: ineBackUrl,
          uploadedAt
        },
        rfc: {
          fileUrl: rfcUrl,
          uploadedAt
        },
        addressProof: {
          fileUrl: addressProofUrl,
          uploadedAt
        }
      };
      
      // Acta constitutiva (opcional para personas morales)
      if (files.constitutiveAct) {
        await this.validateFile(files.constitutiveAct);
        const constitutiveActUrl = await this.uploadFile(files.constitutiveAct, userUploadPath, 'constitutive_act');
        documentUrls.constitutiveAct = {
          fileUrl: constitutiveActUrl,
          uploadedAt
        };
      }
      
      // Documentos adicionales (opcional)
      if (files.additionalDocs && files.additionalDocs.length > 0) {
        documentUrls.additionalDocs = [];
        
        for (let i = 0; i < files.additionalDocs.length; i++) {
          const file = files.additionalDocs[i];
          await this.validateFile(file);
          
          const fileUrl = await this.uploadFile(file, userUploadPath, `additional_${i}`);
          documentUrls.additionalDocs.push({
            name: file.name,
            fileUrl,
            uploadedAt
          });
        }
      }
      
      return documentUrls;
      
    } catch (error) {
      console.error('Error uploading verification documents:', error);
      throw new Error('Error al subir documentos de verificación');
    }
  }
  
  /**
   * 🔍 Validar archivo antes de subir
   */
  private static async validateFile(file: File): Promise<void> {
    // Validar tipo de archivo
    if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo se permiten: ${this.ALLOWED_MIME_TYPES.join(', ')}`);
    }
    
    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`Archivo muy grande: ${Math.round(file.size / 1024 / 1024)}MB. Máximo permitido: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    // Validar que no esté vacío
    if (file.size === 0) {
      throw new Error('El archivo está vacío');
    }
    
    // Validar nombre de archivo
    if (!file.name || file.name.length > 255) {
      throw new Error('Nombre de archivo inválido');
    }
  }
  
  /**
   * 📁 Subir archivo individual
   */
  private static async uploadFile(
    file: File,
    uploadPath: string,
    prefix: string
  ): Promise<string> {
    try {
      // Generar nombre único y seguro
      const timestamp = Date.now();
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const fileExtension = this.getFileExtension(file.name);
      const sanitizedPrefix = this.sanitizeFilename(prefix);
      
      const fileName = `${sanitizedPrefix}_${timestamp}_${randomSuffix}${fileExtension}`;
      const filePath = join(uploadPath, fileName);
      
      // Convertir File a Buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Guardar archivo
      await writeFile(filePath, buffer);
      
      // Retornar URL relativa
      const relativePath = `/uploads/verification/${uploadPath.split('/').pop()}/${fileName}`;
      return relativePath;
      
    } catch (error) {
      console.error('Error uploading individual file:', error);
      throw new Error('Error al subir archivo');
    }
  }
  
  /**
   * 📂 Asegurar que el directorio existe
   */
  private static async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating directory:', error);
      throw new Error('Error al crear directorio de archivos');
    }
  }
  
  /**
   * 🧹 Sanitizar nombre de archivo
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  /**
   * 📎 Obtener extensión de archivo
   */
  private static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.substring(lastDotIndex).toLowerCase();
  }
  
  /**
   * 🗑️ Eliminar archivos de verificación
   */
  static async deleteVerificationDocuments(userId: string): Promise<void> {
    try {
      const userUploadPath = join(this.UPLOAD_BASE_PATH, userId);
      
      if (existsSync(userUploadPath)) {
        const { rmdir } = await import('fs/promises');
        await rmdir(userUploadPath, { recursive: true });
      }
      
    } catch (error) {
      console.error('Error deleting verification documents:', error);
      // No lanzar error, solo logear
    }
  }
  
  /**
   * 📋 Obtener información de archivos subidos
   */
  static async getUploadedFilesInfo(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    files: Array<{
      name: string;
      size: number;
      uploadedAt: Date;
      type: string;
    }>;
  }> {
    try {
      const userUploadPath = join(this.UPLOAD_BASE_PATH, userId);
      
      if (!existsSync(userUploadPath)) {
        return {
          totalFiles: 0,
          totalSize: 0,
          files: []
        };
      }
      
      const { readdir, stat } = await import('fs/promises');
      const files = await readdir(userUploadPath);
      
      let totalSize = 0;
      const fileInfos = [];
      
      for (const file of files) {
        const filePath = join(userUploadPath, file);
        const stats = await stat(filePath);
        
        totalSize += stats.size;
        fileInfos.push({
          name: file,
          size: stats.size,
          uploadedAt: stats.birthtime,
          type: this.getMimeTypeFromExtension(file)
        });
      }
      
      return {
        totalFiles: files.length,
        totalSize,
        files: fileInfos
      };
      
    } catch (error) {
      console.error('Error getting uploaded files info:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        files: []
      };
    }
  }
  
  /**
   * 🔍 Obtener tipo MIME desde extensión
   */
  private static getMimeTypeFromExtension(filename: string): string {
    const extension = this.getFileExtension(filename);
    
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf'
    };
    
    return mimeMap[extension] || 'application/octet-stream';
  }
  
  /**
   * 🔐 Encriptar archivo sensible (para funcionalidad futura)
   */
  static async encryptDocument(buffer: Buffer, key: string): Promise<Buffer> {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
      ]);
      
      // Agregar IV al inicio del archivo encriptado
      return Buffer.concat([iv, encrypted]);
      
    } catch (error) {
      console.error('Error encrypting document:', error);
      throw new Error('Error al encriptar documento');
    }
  }
  
  /**
   * 🔓 Desencriptar archivo (para funcionalidad futura)
   */
  static async decryptDocument(encryptedBuffer: Buffer, key: string): Promise<Buffer> {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = encryptedBuffer.slice(0, 16);
      const encrypted = encryptedBuffer.slice(16);
      
      const decipher = crypto.createDecipher(algorithm, key);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted;
      
    } catch (error) {
      console.error('Error decrypting document:', error);
      throw new Error('Error al desencriptar documento');
    }
  }
}

export default DocumentUploadService;
