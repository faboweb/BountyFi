// Geographic utilities

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a GPS coordinate is within a checkpoint radius
 */
export function isWithinCheckpoint(
  lat: number,
  lng: number,
  checkpointLat: number,
  checkpointLng: number,
  radius: number
): boolean {
  const distance = calculateDistance(lat, lng, checkpointLat, checkpointLng);
  return distance <= radius;
}

/**
 * Calculate time difference in minutes
 */
export function getTimeDifferenceMinutes(timestamp1: string, timestamp2: string): number {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  return Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60));
}
