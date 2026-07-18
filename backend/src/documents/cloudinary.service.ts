import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  generateUploadSignature(familyId: string) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `familyos/${familyId}`;
    const type = 'authenticated';

    const paramsToSign = {
      timestamp,
      folder,
      type,
    };

    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    if (!apiSecret) {
      throw new Error('CLOUDINARY_API_SECRET is not configured');
    }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      signature,
      timestamp,
      folder,
      type,
      apiKey: this.configService.get<string>('CLOUDINARY_API_KEY') || '',
      cloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || '',
    };
  }

  generateDownloadUrl(storageAssetId: string, expiresInSeconds: number = 900): string {
    return cloudinary.url(storageAssetId, {
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.round(Date.now() / 1000) + expiresInSeconds,
      secure: true,
    });
  }

  async deleteAsset(storageAssetId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        storageAssetId,
        { type: 'authenticated' },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary deletion failed for ${storageAssetId}: ${error.message}`);
            reject(error);
          } else {
            resolve(result);
          }
        },
      );
    });
  }
}
