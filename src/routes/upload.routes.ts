import { Router } from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/upload.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  ALLOWED_IMAGE_TYPES,
  FILE_SIZE_LIMITS,
} from '../services/upload.service';
import { BadRequestError } from '../utils/AppError';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images
const imageFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype as typeof ALLOWED_IMAGE_TYPES[number])) {
    cb(null, true);
  } else {
    cb(new BadRequestError(
      `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
      'INVALID_FILE_TYPE'
    ));
  }
};

// Multer configs for different upload types
const profilePhotoUpload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.profilePhoto,
    files: 1,
  },
  fileFilter: imageFileFilter,
});

const portfolioImageUpload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.portfolioImage,
    files: 1,
  },
  fileFilter: imageFileFilter,
});

const jobImageUpload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.jobImage,
    files: 5, // Allow multiple job images
  },
  fileFilter: imageFileFilter,
});

// All upload routes require authentication
router.use(authMiddleware);

// ==================== Direct Upload Routes ====================

/**
 * @route   POST /api/v1/upload/profile-photo
 * @desc    Upload profile photo directly
 * @access  Private
 */
router.post(
  '/profile-photo',
  profilePhotoUpload.single('photo'),
  uploadController.uploadProfilePhoto.bind(uploadController)
);

/**
 * @route   DELETE /api/v1/upload/profile-photo
 * @desc    Delete profile photo
 * @access  Private
 */
router.delete(
  '/profile-photo',
  uploadController.deleteProfilePhoto.bind(uploadController)
);

/**
 * @route   POST /api/v1/upload/portfolio/:itemId
 * @desc    Upload portfolio item image directly
 * @access  Private
 */
router.post(
  '/portfolio/:itemId',
  portfolioImageUpload.single('image'),
  uploadController.uploadPortfolioImage.bind(uploadController)
);

// ==================== Presigned URL Routes ====================

/**
 * @route   POST /api/v1/upload/presigned-url
 * @desc    Get presigned URL for client-side upload
 * @access  Private
 */
router.post(
  '/presigned-url',
  uploadController.getPresignedUrl.bind(uploadController)
);

/**
 * @route   POST /api/v1/upload/confirm/profile-photo
 * @desc    Confirm profile photo after presigned URL upload
 * @access  Private
 */
router.post(
  '/confirm/profile-photo',
  uploadController.confirmProfilePhotoUpload.bind(uploadController)
);

/**
 * @route   POST /api/v1/upload/confirm/portfolio/:itemId
 * @desc    Confirm portfolio image after presigned URL upload
 * @access  Private
 */
router.post(
  '/confirm/portfolio/:itemId',
  uploadController.confirmPortfolioUpload.bind(uploadController)
);

export default router;
