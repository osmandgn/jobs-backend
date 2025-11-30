import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import logger from '../utils/logger';
import { BadRequestError, InternalServerError } from '../utils/AppError';
import { v4 as uuidv4 } from 'uuid';

// Supported file types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  profilePhoto: 5 * 1024 * 1024, // 5MB
  portfolioImage: 10 * 1024 * 1024, // 10MB
  jobImage: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
} as const;

// Upload folders
export const UPLOAD_FOLDERS = {
  profilePhotos: 'profile-photos',
  portfolioImages: 'portfolio-images',
  jobImages: 'job-images',
  documents: 'documents',
} as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

interface UploadOptions {
  folder: UploadFolder;
  userId: string;
  maxSize?: number;
  allowedTypes?: readonly string[];
}

interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  contentType: string;
  size: number;
}

interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

class UploadService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = config.aws.region;
    this.bucket = config.aws.s3Bucket;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
  }

  /**
   * Generate a unique file key for S3
   */
  private generateFileKey(folder: UploadFolder, userId: string, originalName: string): string {
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    return `${folder}/${userId}/${timestamp}-${uniqueId}.${extension}`;
  }

  /**
   * Get the public URL for an S3 object
   */
  private getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Validate file type
   */
  private validateFileType(
    mimeType: string,
    allowedTypes: readonly string[]
  ): void {
    if (!allowedTypes.includes(mimeType)) {
      throw new BadRequestError(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        'INVALID_FILE_TYPE'
      );
    }
  }

  /**
   * Validate file size
   */
  private validateFileSize(size: number, maxSize: number): void {
    if (size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestError(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
        'FILE_TOO_LARGE'
      );
    }
  }

  /**
   * Upload a file buffer to S3
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    const { folder, userId, maxSize, allowedTypes } = options;

    // Default allowed types based on folder
    const defaultAllowedTypes =
      folder === UPLOAD_FOLDERS.documents
        ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES]
        : ALLOWED_IMAGE_TYPES;

    const effectiveAllowedTypes = allowedTypes || defaultAllowedTypes;
    const effectiveMaxSize = maxSize || FILE_SIZE_LIMITS.portfolioImage;

    // Validate
    this.validateFileType(mimeType, effectiveAllowedTypes);
    this.validateFileSize(buffer.length, effectiveMaxSize);

    const key = this.generateFileKey(folder, userId, originalName);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'max-age=31536000', // 1 year cache
        Metadata: {
          'uploaded-by': userId,
          'original-name': originalName,
        },
      });

      await this.s3Client.send(command);

      logger.info(`File uploaded to S3: ${key}`);

      return {
        key,
        url: this.getPublicUrl(key),
        bucket: this.bucket,
        contentType: mimeType,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new InternalServerError('Failed to upload file');
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string
  ): Promise<UploadResult> {
    return this.uploadFile(buffer, originalName, mimeType, {
      folder: UPLOAD_FOLDERS.profilePhotos,
      userId,
      maxSize: FILE_SIZE_LIMITS.profilePhoto,
      allowedTypes: ALLOWED_IMAGE_TYPES,
    });
  }

  /**
   * Upload portfolio image
   */
  async uploadPortfolioImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string
  ): Promise<UploadResult> {
    return this.uploadFile(buffer, originalName, mimeType, {
      folder: UPLOAD_FOLDERS.portfolioImages,
      userId,
      maxSize: FILE_SIZE_LIMITS.portfolioImage,
      allowedTypes: ALLOWED_IMAGE_TYPES,
    });
  }

  /**
   * Upload job image
   */
  async uploadJobImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string
  ): Promise<UploadResult> {
    return this.uploadFile(buffer, originalName, mimeType, {
      folder: UPLOAD_FOLDERS.jobImages,
      userId,
      maxSize: FILE_SIZE_LIMITS.jobImage,
      allowedTypes: ALLOWED_IMAGE_TYPES,
    });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new InternalServerError('Failed to delete file');
    }
  }

  /**
   * Delete a file by its URL
   */
  async deleteFileByUrl(url: string): Promise<void> {
    const key = this.extractKeyFromUrl(url);
    if (key) {
      await this.deleteFile(key);
    }
  }

  /**
   * Extract S3 key from URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Handle both path-style and virtual-hosted-style URLs
      const pathname = urlObj.pathname;
      // Remove leading slash
      return pathname.startsWith('/') ? pathname.substring(1) : pathname;
    } catch {
      logger.warn(`Failed to extract key from URL: ${url}`);
      return null;
    }
  }

  /**
   * Generate a presigned URL for direct upload from client
   */
  async getPresignedUploadUrl(
    folder: UploadFolder,
    userId: string,
    fileName: string,
    contentType: string,
    expiresIn: number = 300 // 5 minutes default
  ): Promise<PresignedUrlResult> {
    const key = this.generateFileKey(folder, userId, fileName);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        Metadata: {
          'uploaded-by': userId,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new InternalServerError('Failed to generate upload URL');
    }
  }

  /**
   * Generate a presigned URL for downloading/viewing a file
   */
  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating presigned download URL:', error);
      throw new InternalServerError('Failed to generate download URL');
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}

export const uploadService = new UploadService();
export default uploadService;
