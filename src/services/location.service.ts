import { cacheService } from './cache.service';
import { CACHE_TTL } from '../utils/cacheTTL';
import logger from '../utils/logger';

// UK Postcode regex pattern
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

export interface PostcodeLookupResult {
  postcode: string;
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string;
  admin_district: string | null;
}

export interface PostcodeValidationResult {
  valid: boolean;
  postcode?: string;
  error?: string;
}

export interface LocationSearchResult {
  postcode: string;
  city: string | null;
  region: string | null;
  latitude: number;
  longitude: number;
}

class LocationService {
  private readonly POSTCODES_IO_BASE = 'https://api.postcodes.io';

  /**
   * Validate UK postcode format
   */
  validatePostcodeFormat(postcode: string): PostcodeValidationResult {
    const cleaned = postcode.toUpperCase().replace(/\s+/g, ' ').trim();

    if (!UK_POSTCODE_REGEX.test(cleaned)) {
      return {
        valid: false,
        error: 'Invalid UK postcode format',
      };
    }

    return {
      valid: true,
      postcode: cleaned,
    };
  }

  /**
   * Lookup a postcode using postcodes.io API
   */
  async lookupPostcode(postcode: string): Promise<PostcodeLookupResult | null> {
    const validation = this.validatePostcodeFormat(postcode);
    if (!validation.valid || !validation.postcode) {
      return null;
    }

    const cleanPostcode = validation.postcode;
    const cacheKey = `postcode:lookup:${cleanPostcode.replace(/\s/g, '')}`;

    // Check cache first
    const cached = await cacheService.get<PostcodeLookupResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.POSTCODES_IO_BASE}/postcodes/${encodeURIComponent(cleanPostcode)}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn(`Postcode not found: ${cleanPostcode}`);
          return null;
        }
        throw new Error(`Postcodes.io API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        status: number;
        result?: {
          postcode: string;
          latitude: number;
          longitude: number;
          admin_district: string | null;
          region: string | null;
          country: string;
          parliamentary_constituency: string | null;
        };
      };

      if (data.status !== 200 || !data.result) {
        return null;
      }

      const result: PostcodeLookupResult = {
        postcode: data.result.postcode,
        latitude: data.result.latitude,
        longitude: data.result.longitude,
        city: data.result.admin_district,
        region: data.result.region,
        country: data.result.country,
        admin_district: data.result.admin_district,
      };

      // Cache for 24 hours
      await cacheService.set(cacheKey, result, CACHE_TTL.POSTCODE_LOOKUP);

      return result;
    } catch (error) {
      logger.error('Postcode lookup error:', error);
      return null;
    }
  }

  /**
   * Validate a postcode exists using postcodes.io API
   */
  async validatePostcode(postcode: string): Promise<PostcodeValidationResult> {
    const formatValidation = this.validatePostcodeFormat(postcode);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    const lookup = await this.lookupPostcode(postcode);
    if (!lookup) {
      return {
        valid: false,
        error: 'Postcode not found',
      };
    }

    return {
      valid: true,
      postcode: lookup.postcode,
    };
  }

  /**
   * Bulk lookup multiple postcodes
   */
  async bulkLookupPostcodes(
    postcodes: string[]
  ): Promise<Map<string, PostcodeLookupResult | null>> {
    const results = new Map<string, PostcodeLookupResult | null>();

    // Check cache for each postcode first
    const uncachedPostcodes: string[] = [];

    for (const postcode of postcodes) {
      const validation = this.validatePostcodeFormat(postcode);
      if (!validation.valid || !validation.postcode) {
        results.set(postcode, null);
        continue;
      }

      const cleanPostcode = validation.postcode;
      const cacheKey = `postcode:lookup:${cleanPostcode.replace(/\s/g, '')}`;
      const cached = await cacheService.get<PostcodeLookupResult>(cacheKey);

      if (cached) {
        results.set(postcode, cached);
      } else {
        uncachedPostcodes.push(cleanPostcode);
      }
    }

    // Bulk lookup uncached postcodes
    if (uncachedPostcodes.length > 0) {
      try {
        const response = await fetch(`${this.POSTCODES_IO_BASE}/postcodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postcodes: uncachedPostcodes }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            status: number;
            result: Array<{
              query: string;
              result: {
                postcode: string;
                latitude: number;
                longitude: number;
                admin_district: string | null;
                region: string | null;
                country: string;
              } | null;
            }>;
          };

          for (const item of data.result) {
            if (item.result) {
              const result: PostcodeLookupResult = {
                postcode: item.result.postcode,
                latitude: item.result.latitude,
                longitude: item.result.longitude,
                city: item.result.admin_district,
                region: item.result.region,
                country: item.result.country,
                admin_district: item.result.admin_district,
              };

              results.set(item.query, result);

              // Cache result
              const cacheKey = `postcode:lookup:${item.query.replace(/\s/g, '')}`;
              await cacheService.set(cacheKey, result, CACHE_TTL.POSTCODE_LOOKUP);
            } else {
              results.set(item.query, null);
            }
          }
        }
      } catch (error) {
        logger.error('Bulk postcode lookup error:', error);
        // Set remaining as null
        for (const postcode of uncachedPostcodes) {
          if (!results.has(postcode)) {
            results.set(postcode, null);
          }
        }
      }
    }

    return results;
  }

  /**
   * Reverse geocode lat/lng to nearest postcode
   */
  async reverseGeocode(
    lat: number,
    lng: number
  ): Promise<PostcodeLookupResult | null> {
    const cacheKey = `postcode:reverse:${lat.toFixed(5)}_${lng.toFixed(5)}`;

    const cached = await cacheService.get<PostcodeLookupResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${this.POSTCODES_IO_BASE}/postcodes?lon=${lng}&lat=${lat}`
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        status: number;
        result: Array<{
          postcode: string;
          latitude: number;
          longitude: number;
          admin_district: string | null;
          region: string | null;
          country: string;
        }> | null;
      };

      if (data.status !== 200 || !data.result || data.result.length === 0) {
        return null;
      }

      const nearest = data.result[0]!;
      const result: PostcodeLookupResult = {
        postcode: nearest.postcode,
        latitude: nearest.latitude,
        longitude: nearest.longitude,
        city: nearest.admin_district,
        region: nearest.region,
        country: nearest.country,
        admin_district: nearest.admin_district,
      };

      await cacheService.set(cacheKey, result, CACHE_TTL.POSTCODE_LOOKUP);

      return result;
    } catch (error) {
      logger.error('Reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Autocomplete postcode input
   */
  async autocompletePostcode(partial: string): Promise<string[]> {
    if (partial.length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.POSTCODES_IO_BASE}/postcodes/${encodeURIComponent(partial)}/autocomplete`
      );

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        status: number;
        result: string[] | null;
      };

      return data.result || [];
    } catch (error) {
      logger.error('Postcode autocomplete error:', error);
      return [];
    }
  }

  /**
   * Search for places by query (uses postcodes.io places endpoint)
   */
  async searchPlaces(query: string): Promise<LocationSearchResult[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.POSTCODES_IO_BASE}/places?q=${encodeURIComponent(query)}&limit=10`
      );

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as {
        status: number;
        result: Array<{
          code: string;
          name_1: string;
          county_unitary: string | null;
          region: string | null;
          latitude: number;
          longitude: number;
        }> | null;
      };

      if (!data.result) {
        return [];
      }

      return data.result.map((place) => ({
        postcode: place.code,
        city: place.name_1,
        region: place.region,
        latitude: place.latitude,
        longitude: place.longitude,
      }));
    } catch (error) {
      logger.error('Place search error:', error);
      return [];
    }
  }

  /**
   * Get coordinates from postcode (simple helper)
   */
  async getCoordinates(
    postcode: string
  ): Promise<{ lat: number; lng: number } | null> {
    const result = await this.lookupPostcode(postcode);
    if (!result) {
      return null;
    }

    return {
      lat: result.latitude,
      lng: result.longitude,
    };
  }
}

export const locationService = new LocationService();
export default locationService;
