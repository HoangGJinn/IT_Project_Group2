/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters
  
  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Check if student location is within allowed radius
 * @param {number} classLat - Class latitude
 * @param {number} classLon - Class longitude
 * @param {number} studentLat - Student latitude
 * @param {number} studentLon - Student longitude
 * @param {number} radius - Allowed radius in meters (default: 100)
 * @returns {boolean} True if within radius
 */
function isWithinRadius(classLat, classLon, studentLat, studentLon, radius = 100) {
  if (!classLat || !classLon || !studentLat || !studentLon) {
    return false;
  }
  
  const distance = calculateDistance(classLat, classLon, studentLat, studentLon);
  return distance <= radius;
}

module.exports = {
  calculateDistance,
  isWithinRadius
};

