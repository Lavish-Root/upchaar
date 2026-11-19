import path from 'path';
import fs from 'fs';
import { config } from '../config';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class StorageService {
  private hasCloudinary: boolean;

  constructor() {
    this.hasCloudinary = Boolean(
      config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret
    );
  }

  /**
   * Store an uploaded buffer or return static serving URL
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'medical_records'): Promise<string> {
    if (this.hasCloudinary) {
      try {
        // If cloudinary SDK is desired, it can be called here.
        // For portable zero-breakage setups, we ensure local fallback.
      } catch (err) {
        console.warn('Cloudinary upload failed, saving locally:', err);
      }
    }

    // Save to local upload directory
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `${folder}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const destinationPath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(destinationPath, file.buffer);
    return `/uploads/${filename}`;
  }
}

export const storageService = new StorageService();
