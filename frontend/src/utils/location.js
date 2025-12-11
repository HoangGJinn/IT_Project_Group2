/**
 * Utility functions for getting location from various sources
 */

/**
 * Get location from GPS (navigator.geolocation)
 */
export const getGPSLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt không hỗ trợ định vị GPS'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'GPS',
        });
      },
      error => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Get location from IP address using free API
 */
export const getIPLocation = async () => {
  try {
    // Try ip-api.com (free, no API key required)
    const response = await fetch('http://ip-api.com/json/?fields=status,lat,lon,query');
    const data = await response.json();

    if (data.status === 'success' && data.lat && data.lon) {
      return {
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        accuracy: 1000, // IP geolocation is less accurate
        source: 'IP',
      };
    }
    throw new Error('Không thể lấy vị trí từ IP');
  } catch (error) {
    console.error('IP geolocation error:', error);
    // Fallback to ipapi.co
    try {
      const response2 = await fetch('https://ipapi.co/json/');
      const data2 = await response2.json();

      if (data2.latitude && data2.longitude) {
        return {
          latitude: parseFloat(data2.latitude),
          longitude: parseFloat(data2.longitude),
          accuracy: 1000,
          source: 'IP',
        };
      }
    } catch (error2) {
      console.error('IP geolocation fallback error:', error2);
    }
    throw new Error('Không thể lấy vị trí từ IP');
  }
};

/**
 * Geocode address to coordinates using Nominatim (OpenStreetMap, free)
 */
export const geocodeAddress = async address => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'ClassManagementSystem/1.0',
        },
      }
    );
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        accuracy: 50, // Address geocoding accuracy
        source: 'ADDRESS',
        displayName: data[0].display_name,
      };
    }
    throw new Error('Không tìm thấy địa chỉ');
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Không thể tìm tọa độ từ địa chỉ');
  }
};

/**
 * Try to get location from multiple sources
 * Priority: GPS > IP > Manual input
 */
export const getLocationWithFallback = async (options = {}) => {
  const { allowManual = true, onManualRequest } = options;

  // Try GPS first
  try {
    const gpsLocation = await getGPSLocation();
    return gpsLocation;
  } catch (gpsError) {
    console.warn('GPS not available, trying IP geolocation...');

    // Try IP geolocation
    try {
      const ipLocation = await getIPLocation();
      return ipLocation;
    } catch (ipError) {
      console.warn('IP geolocation failed');

      // If manual input is allowed, request it
      if (allowManual && onManualRequest) {
        return await onManualRequest();
      }

      throw new Error('Không thể lấy vị trí tự động. Vui lòng nhập vị trí thủ công.');
    }
  }
};

/**
 * Calculate great-circle distance (meters) using haversine
 */
const toRadians = degrees => (degrees * Math.PI) / 180;

export const haversineDistanceMeters = (a, b) => {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const removeOutliers = (samples, thresholdMeters) => {
  if (!samples.length) return [];
  const latMed = median(samples.map(s => s.latitude));
  const lonMed = median(samples.map(s => s.longitude));
  const center = { latitude: latMed, longitude: lonMed };

  return samples.filter(sample => {
    const dist = haversineDistanceMeters(center, sample);
    return dist <= thresholdMeters;
  });
};

/**
 * Sample multiple GPS fixes, filter outliers, and return a stable point.
 * Options:
 *  - samples: number of desired samples (default 5)
 *  - intervalMs: delay between samples
 *  - maxDurationMs: hard timeout for sampling
 *  - outlierThreshold: meters to drop outliers vs median
 */
export const getFilteredLocation = async ({
  samples = 5,
  intervalMs = 1500,
  maxDurationMs = 10000,
  outlierThreshold = 50,
} = {}) => {
  if (!navigator.geolocation) {
    throw new Error('Trình duyệt không hỗ trợ định vị GPS');
  }

  const rawSamples = [];
  const start = Date.now();

  const getFix = () =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          });
        },
        err => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });

  while (rawSamples.length < samples && Date.now() - start < maxDurationMs) {
    const fix = await getFix();
    rawSamples.push(fix);
    if (rawSamples.length < samples) {
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }

  if (!rawSamples.length) {
    throw new Error('Không thể lấy vị trí GPS');
  }

  const filtered = removeOutliers(rawSamples, outlierThreshold);
  const usableSamples = filtered.length ? filtered : rawSamples;
  const latMed = median(usableSamples.map(s => s.latitude));
  const lonMed = median(usableSamples.map(s => s.longitude));

  const bestSample = usableSamples.reduce((best, curr) =>
    curr.accuracy < best.accuracy ? curr : best
  );

  // Estimated accuracy: take min accuracy among usable samples
  const estimatedAccuracy = bestSample.accuracy;

  return {
    latitude: latMed,
    longitude: lonMed,
    accuracy: estimatedAccuracy,
    source: 'GPS',
    samples: rawSamples,
    filteredSamples: usableSamples,
    bestSample,
  };
};

/**
 * Validate coordinates
 */
export const validateCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Tọa độ không hợp lệ' };
  }

  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Vĩ độ phải nằm trong khoảng -90 đến 90' };
  }

  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Kinh độ phải nằm trong khoảng -180 đến 180' };
  }

  return { valid: true, latitude: lat, longitude: lon };
};
