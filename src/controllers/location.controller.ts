import { Request, Response, NextFunction } from 'express';
import { locationService } from '../services/location.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError, ErrorCodes } from '../utils/AppError';
import { z } from 'zod';

// Validation schemas
const postcodeParamSchema = z.object({
  postcode: z.string().min(2, 'Postcode en az 2 karakter olmalıdır'),
});

const searchQuerySchema = z.object({
  q: z.string().min(2, 'Arama terimi en az 2 karakter olmalıdır'),
});

const autocompleteQuerySchema = z.object({
  partial: z.string().min(2, 'En az 2 karakter giriniz'),
});

const reverseGeocodeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

class LocationController {
  /**
   * GET /api/v1/locations/validate/:postcode
   * Validate a UK postcode
   */
  async validatePostcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { postcode } = postcodeParamSchema.parse(req.params);

      const result = await locationService.validatePostcode(postcode);

      if (!result.valid) {
        throw new BadRequestError(
          result.error || 'Geçersiz postcode',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      sendSuccess(res, {
        valid: true,
        postcode: result.postcode,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/locations/lookup/:postcode
   * Lookup postcode details
   */
  async lookupPostcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { postcode } = postcodeParamSchema.parse(req.params);

      const result = await locationService.lookupPostcode(postcode);

      if (!result) {
        throw new BadRequestError(
          'Postcode bulunamadı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      sendSuccess(res, {
        postcode: result.postcode,
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.city,
        region: result.region,
        country: result.country,
        adminDistrict: result.admin_district,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/locations/autocomplete
   * Autocomplete postcode input
   */
  async autocompletePostcode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { partial } = autocompleteQuerySchema.parse(req.query);

      const results = await locationService.autocompletePostcode(partial);

      sendSuccess(res, {
        postcodes: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/locations/search
   * Search places by name
   */
  async searchPlaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = searchQuerySchema.parse(req.query);

      const results = await locationService.searchPlaces(q);

      sendSuccess(res, {
        places: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/locations/reverse
   * Reverse geocode lat/lng to postcode
   */
  async reverseGeocode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng } = reverseGeocodeQuerySchema.parse(req.query);

      const result = await locationService.reverseGeocode(lat, lng);

      if (!result) {
        throw new BadRequestError(
          'Bu konuma yakın postcode bulunamadı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      sendSuccess(res, {
        postcode: result.postcode,
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.city,
        region: result.region,
        country: result.country,
        adminDistrict: result.admin_district,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/locations/coordinates/:postcode
   * Get coordinates for a postcode (simple helper)
   */
  async getCoordinates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { postcode } = postcodeParamSchema.parse(req.params);

      const result = await locationService.getCoordinates(postcode);

      if (!result) {
        throw new BadRequestError(
          'Postcode için koordinatlar bulunamadı',
          ErrorCodes.VALIDATION_FAILED
        );
      }

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const locationController = new LocationController();
export default locationController;
