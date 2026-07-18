import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from '../cloudinary.service';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

jest.mock('cloudinary', () => {
  return {
    v2: {
      config: jest.fn(),
      url: jest.fn().mockReturnValue('https://res.cloudinary.com/mock/image/authenticated'),
      uploader: {
        destroy: jest.fn().mockImplementation((publicId, options, callback) => {
          callback(null, { result: 'ok' });
        }),
      },
      utils: {
        api_sign_request: jest.fn().mockReturnValue('mocked_signature'),
      },
    },
  };
});

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case 'CLOUDINARY_CLOUD_NAME':
          return 'mock-cloud';
        case 'CLOUDINARY_API_KEY':
          return 'mock-key';
        case 'CLOUDINARY_API_SECRET':
          return 'mock-secret';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should initialize and call cloudinary.config with env values', () => {
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'mock-cloud',
      api_key: 'mock-key',
      api_secret: 'mock-secret',
    });
  });

  describe('generateUploadSignature', () => {
    it('should generate signature, timestamp, folder, and return config keys', () => {
      const result = service.generateUploadSignature('family-1');

      expect(result.signature).toBe('mocked_signature');
      expect(result.folder).toBe('familyos/family-1');
      expect(result.type).toBe('authenticated');
      expect(result.apiKey).toBe('mock-key');
      expect(result.cloudName).toBe('mock-cloud');
      expect(cloudinary.utils.api_sign_request).toHaveBeenCalledWith(
        {
          timestamp: expect.any(Number),
          folder: 'familyos/family-1',
          type: 'authenticated',
        },
        'mock-secret',
      );
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate secure signed URL with expires_at in the future', () => {
      const url = service.generateDownloadUrl('asset-123', 900);

      expect(url).toBe('https://res.cloudinary.com/mock/image/authenticated');
      expect(cloudinary.url).toHaveBeenCalledWith('asset-123', {
        sign_url: true,
        type: 'authenticated',
        expires_at: expect.any(Number),
        secure: true,
      });
    });
  });

  describe('deleteAsset', () => {
    it('should resolve with deletion result when destroy succeeds', async () => {
      const result = await service.deleteAsset('asset-123');
      expect(result).toEqual({ result: 'ok' });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
        'asset-123',
        { type: 'authenticated' },
        expect.any(Function),
      );
    });
  });
});
