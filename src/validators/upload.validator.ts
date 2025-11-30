import { z } from 'zod';
import { UPLOAD_FOLDERS, ALLOWED_IMAGE_TYPES } from '../services/upload.service';

const allowedImageTypes = [...ALLOWED_IMAGE_TYPES] as string[];
const allowedFolders = [
  UPLOAD_FOLDERS.profilePhotos,
  UPLOAD_FOLDERS.portfolioImages,
  UPLOAD_FOLDERS.jobImages,
] as string[];

// Schema for presigned URL request
export const presignedUrlSchema = z.object({
  fileName: z
    .string()
    .min(1, 'File name is required')
    .max(255, 'File name too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid file name characters'),
  contentType: z
    .string()
    .refine(
      (val) => allowedImageTypes.includes(val),
      `Invalid content type. Allowed: ${allowedImageTypes.join(', ')}`
    ),
  folder: z
    .string()
    .refine(
      (val) => allowedFolders.includes(val),
      `Invalid folder. Allowed: ${allowedFolders.join(', ')}`
    ),
});

// Schema for confirming upload (after presigned URL upload)
export const confirmUploadSchema = z.object({
  key: z.string().min(1, 'S3 key is required'),
  targetType: z
    .string()
    .refine(
      (val) => ['profile-photo', 'portfolio-item', 'job-image'].includes(val),
      'Invalid target type'
    ),
  targetId: z.string().uuid().optional(), // e.g., portfolioItemId or jobId
});

// Schema for deleting a file
export const deleteFileSchema = z.object({
  key: z.string().min(1, 'S3 key is required'),
});

export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
