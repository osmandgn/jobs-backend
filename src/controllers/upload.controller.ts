import { Request, Response, NextFunction } from 'express';
import { uploadService, UPLOAD_FOLDERS, UploadFolder } from '../services/upload.service';
import { userService } from '../services/user.service';
import { profileService } from '../services/profile.service';
import { sendSuccess, sendNoContent } from '../utils/response';
import { AppError, ErrorCodes, BadRequestError } from '../utils/AppError';
import { presignedUrlSchema, PresignedUrlInput } from '../validators/upload.validator';
import logger from '../utils/logger';

// Extended Request type for multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export class UploadController {
  /**
   * Upload profile photo (direct upload)
   * POST /api/v1/upload/profile-photo
   */
  async uploadProfilePhoto(
    req: MulterRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const file = req.file;
      if (!file) {
        throw new BadRequestError('No file uploaded', 'NO_FILE');
      }

      // Get current user to check if they have an existing photo
      const currentProfile = await userService.getProfile(userId);
      const oldPhotoUrl = currentProfile.profilePhotoUrl;

      // Upload to S3
      const result = await uploadService.uploadProfilePhoto(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId
      );

      // Update user profile with new photo URL
      const updatedProfile = await userService.updateProfilePhoto(userId, result.url);

      // Delete old photo if exists
      if (oldPhotoUrl) {
        try {
          await uploadService.deleteFileByUrl(oldPhotoUrl);
        } catch (error) {
          logger.warn(`Failed to delete old profile photo: ${oldPhotoUrl}`, error);
        }
      }

      sendSuccess(res, {
        url: result.url,
        profile: updatedProfile,
      }, 'Profile photo uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete profile photo
   * DELETE /api/v1/upload/profile-photo
   */
  async deleteProfilePhoto(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const currentProfile = await userService.getProfile(userId);
      const photoUrl = currentProfile.profilePhotoUrl;

      if (!photoUrl) {
        throw new BadRequestError('No profile photo to delete', 'NO_PHOTO');
      }

      // Delete from S3
      await uploadService.deleteFileByUrl(photoUrl);

      // Update user profile
      await userService.updateProfilePhoto(userId, null);

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload portfolio image (direct upload)
   * POST /api/v1/upload/portfolio/:itemId
   */
  async uploadPortfolioImage(
    req: MulterRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { itemId } = req.params;
      if (!itemId) {
        throw new BadRequestError('Portfolio item ID is required', 'MISSING_ITEM_ID');
      }

      const file = req.file;
      if (!file) {
        throw new BadRequestError('No file uploaded', 'NO_FILE');
      }

      // Get portfolio item to verify ownership and get old image URL
      const portfolioItems = await profileService.getUserPortfolio(userId);
      const item = portfolioItems.find((p) => p.id === itemId);

      if (!item) {
        throw new AppError('Portfolio item not found', 404, ErrorCodes.NOT_FOUND);
      }

      const oldImageUrl = item.imageUrl;

      // Upload to S3
      const result = await uploadService.uploadPortfolioImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId
      );

      // Update portfolio item with new image URL
      const updatedItem = await profileService.updatePortfolioItem(userId, itemId, {
        imageUrl: result.url,
      });

      // Delete old image if exists and is different
      if (oldImageUrl && oldImageUrl !== result.url) {
        try {
          await uploadService.deleteFileByUrl(oldImageUrl);
        } catch (error) {
          logger.warn(`Failed to delete old portfolio image: ${oldImageUrl}`, error);
        }
      }

      sendSuccess(res, {
        url: result.url,
        portfolioItem: updatedItem,
      }, 'Portfolio image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get presigned URL for client-side upload
   * POST /api/v1/upload/presigned-url
   */
  async getPresignedUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const validation = presignedUrlSchema.safeParse(req.body);
      if (!validation.success) {
        const firstIssue = validation.error.issues[0];
        throw new BadRequestError(
          firstIssue?.message || 'Validation failed',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      const { fileName, contentType, folder } = validation.data as PresignedUrlInput;

      const result = await uploadService.getPresignedUploadUrl(
        folder as UploadFolder,
        userId,
        fileName,
        contentType
      );

      sendSuccess(res, {
        uploadUrl: result.uploadUrl,
        key: result.key,
        expiresIn: result.expiresIn,
        publicUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-2'}.amazonaws.com/${result.key}`,
      }, 'Presigned URL generated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm upload after presigned URL upload (for profile photo)
   * POST /api/v1/upload/confirm/profile-photo
   */
  async confirmProfilePhotoUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { key } = req.body;
      if (!key || typeof key !== 'string') {
        throw new BadRequestError('S3 key is required', ErrorCodes.VALIDATION_FAILED);
      }

      // Verify the file exists and belongs to user's folder
      if (!key.startsWith(`${UPLOAD_FOLDERS.profilePhotos}/${userId}/`)) {
        throw new BadRequestError('Invalid file key', 'INVALID_KEY');
      }

      const exists = await uploadService.fileExists(key);
      if (!exists) {
        throw new BadRequestError('File not found in S3', 'FILE_NOT_FOUND');
      }

      // Get current profile to delete old photo
      const currentProfile = await userService.getProfile(userId);
      const oldPhotoUrl = currentProfile.profilePhotoUrl;

      // Construct public URL
      const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-2'}.amazonaws.com/${key}`;

      // Update user profile
      const updatedProfile = await userService.updateProfilePhoto(userId, publicUrl);

      // Delete old photo if exists
      if (oldPhotoUrl && oldPhotoUrl !== publicUrl) {
        try {
          await uploadService.deleteFileByUrl(oldPhotoUrl);
        } catch (error) {
          logger.warn(`Failed to delete old profile photo: ${oldPhotoUrl}`, error);
        }
      }

      sendSuccess(res, {
        url: publicUrl,
        profile: updatedProfile,
      }, 'Profile photo confirmed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm upload after presigned URL upload (for portfolio)
   * POST /api/v1/upload/confirm/portfolio/:itemId
   */
  async confirmPortfolioUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const { itemId } = req.params;
      if (!itemId) {
        throw new BadRequestError('Portfolio item ID is required', 'MISSING_ITEM_ID');
      }

      const { key } = req.body;
      if (!key || typeof key !== 'string') {
        throw new BadRequestError('S3 key is required', ErrorCodes.VALIDATION_FAILED);
      }

      // Verify the file belongs to user's folder
      if (!key.startsWith(`${UPLOAD_FOLDERS.portfolioImages}/${userId}/`)) {
        throw new BadRequestError('Invalid file key', 'INVALID_KEY');
      }

      const exists = await uploadService.fileExists(key);
      if (!exists) {
        throw new BadRequestError('File not found in S3', 'FILE_NOT_FOUND');
      }

      // Get portfolio item to verify ownership
      const portfolioItems = await profileService.getUserPortfolio(userId);
      const item = portfolioItems.find((p) => p.id === itemId);

      if (!item) {
        throw new AppError('Portfolio item not found', 404, ErrorCodes.NOT_FOUND);
      }

      const oldImageUrl = item.imageUrl;

      // Construct public URL
      const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-2'}.amazonaws.com/${key}`;

      // Update portfolio item
      const updatedItem = await profileService.updatePortfolioItem(userId, itemId, {
        imageUrl: publicUrl,
      });

      // Delete old image if exists and is different
      if (oldImageUrl && oldImageUrl !== publicUrl) {
        try {
          await uploadService.deleteFileByUrl(oldImageUrl);
        } catch (error) {
          logger.warn(`Failed to delete old portfolio image: ${oldImageUrl}`, error);
        }
      }

      sendSuccess(res, {
        url: publicUrl,
        portfolioItem: updatedItem,
      }, 'Portfolio image confirmed');
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
export default uploadController;
