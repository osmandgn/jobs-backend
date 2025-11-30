import { Router } from 'express';
import { locationController } from '../controllers/location.controller';

const router = Router();

/**
 * @route   GET /api/v1/locations/validate/:postcode
 * @desc    Validate a UK postcode
 * @access  Public
 */
router.get('/validate/:postcode', locationController.validatePostcode.bind(locationController));

/**
 * @route   GET /api/v1/locations/lookup/:postcode
 * @desc    Lookup postcode details (coordinates, city, region)
 * @access  Public
 */
router.get('/lookup/:postcode', locationController.lookupPostcode.bind(locationController));

/**
 * @route   GET /api/v1/locations/autocomplete
 * @desc    Autocomplete postcode input
 * @access  Public
 * @query   partial - Partial postcode string (min 2 chars)
 */
router.get('/autocomplete', locationController.autocompletePostcode.bind(locationController));

/**
 * @route   GET /api/v1/locations/search
 * @desc    Search places by name
 * @access  Public
 * @query   q - Search term (min 2 chars)
 */
router.get('/search', locationController.searchPlaces.bind(locationController));

/**
 * @route   GET /api/v1/locations/reverse
 * @desc    Reverse geocode lat/lng to nearest postcode
 * @access  Public
 * @query   lat - Latitude
 * @query   lng - Longitude
 */
router.get('/reverse', locationController.reverseGeocode.bind(locationController));

/**
 * @route   GET /api/v1/locations/coordinates/:postcode
 * @desc    Get coordinates for a postcode
 * @access  Public
 */
router.get('/coordinates/:postcode', locationController.getCoordinates.bind(locationController));

export default router;
