/**
 * Haversine formula for calculating distance between two geographic points
 * Returns distance in miles
 */

const EARTH_RADIUS_MILES = 3958.8; // Earth's radius in miles
const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @param unit 'miles' or 'km'
 * @returns Distance in specified unit
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  unit: 'miles' | 'km' = 'miles'
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const radius = unit === 'miles' ? EARTH_RADIUS_MILES : EARTH_RADIUS_KM;
  return radius * c;
}

/**
 * Get bounding box coordinates for a given center point and radius
 * Used to pre-filter results before precise distance calculation
 * @param lat Center latitude
 * @param lng Center longitude
 * @param radiusMiles Radius in miles
 * @returns Bounding box { minLat, maxLat, minLng, maxLng }
 */
export function getBoundingBox(
  lat: number,
  lng: number,
  radiusMiles: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  // Approximate degrees per mile
  const latDegPerMile = 1 / 69.0; // 1 degree latitude ≈ 69 miles
  const lngDegPerMile = 1 / (69.0 * Math.cos(toRadians(lat))); // Varies with latitude

  const latOffset = radiusMiles * latDegPerMile;
  const lngOffset = radiusMiles * lngDegPerMile;

  return {
    minLat: lat - latOffset,
    maxLat: lat + latOffset,
    minLng: lng - lngOffset,
    maxLng: lng + lngOffset,
  };
}

/**
 * Format distance for display
 * @param distance Distance in miles
 * @returns Formatted string (e.g., "2.5 miles", "0.3 miles")
 */
export function formatDistance(distance: number): string {
  if (distance < 0.1) {
    return 'Less than 0.1 miles';
  }
  return `${distance.toFixed(1)} miles`;
}

/**
 * Check if a point is within a given radius from a center point
 * @param centerLat Center latitude
 * @param centerLng Center longitude
 * @param pointLat Point latitude
 * @param pointLng Point longitude
 * @param radiusMiles Radius in miles
 * @returns true if point is within radius
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, pointLat, pointLng, 'miles');
  return distance <= radiusMiles;
}

export default {
  calculateDistance,
  getBoundingBox,
  formatDistance,
  isWithinRadius,
};
