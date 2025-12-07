import { useState, useEffect } from 'react';
import {
  getGPSLocation,
  getIPLocation,
  geocodeAddress,
  validateCoordinates,
} from '../utils/location';

function LocationPicker({ onLocationSelected, onCancel, initialLocation = null }) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(initialLocation || { latitude: '', longitude: '' });
  const [method, setMethod] = useState('auto'); // 'auto', 'gps', 'ip', 'address', 'manual'
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState('');
  const [locationInfo, setLocationInfo] = useState(null);

  useEffect(() => {
    // Auto-detect location on mount
    if (!initialLocation) {
      detectLocation();
    }
  }, []);

  const detectLocation = async () => {
    setLoading(true);
    setError('');

    try {
      // Try GPS first
      try {
        const gpsLoc = await getGPSLocation();
        setLocation({ latitude: gpsLoc.latitude, longitude: gpsLoc.longitude });
        setLocationInfo({ ...gpsLoc, method: 'GPS' });
        setMethod('gps');
        setLoading(false);
        return;
      } catch (gpsError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('GPS not available:', gpsError);
        }
      }

      // Try IP geolocation
      try {
        const ipLoc = await getIPLocation();
        setLocation({ latitude: ipLoc.latitude, longitude: ipLoc.longitude });
        setLocationInfo({ ...ipLoc, method: 'IP (WiFi/LAN)' });
        setMethod('ip');
        setLoading(false);
        return;
      } catch (ipError) {
        if (process.env.NODE_ENV === 'development') {
          console.log('IP geolocation failed:', ipError);
        }
      }

      // If both fail, show manual input
      setMethod('manual');
      setError('Không thể tự động lấy vị trí. Vui lòng chọn phương thức khác.');
    } catch (error) {
      setError('Không thể lấy vị trí tự động');
      setMethod('manual');
    } finally {
      setLoading(false);
    }
  };

  const handleGPS = async () => {
    setLoading(true);
    setError('');
    setMethod('gps');

    try {
      const gpsLoc = await getGPSLocation();
      setLocation({ latitude: gpsLoc.latitude, longitude: gpsLoc.longitude });
      setLocationInfo({ ...gpsLoc, method: 'GPS' });
    } catch (error) {
      setError(
        'Không thể lấy vị trí GPS. Vui lòng kiểm tra quyền truy cập vị trí hoặc thử phương thức khác.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIP = async () => {
    setLoading(true);
    setError('');
    setMethod('ip');

    try {
      const ipLoc = await getIPLocation();
      setLocation({ latitude: ipLoc.latitude, longitude: ipLoc.longitude });
      setLocationInfo({ ...ipLoc, method: 'IP (WiFi/LAN)' });
    } catch (error) {
      setError('Không thể lấy vị trí từ IP. Vui lòng thử phương thức khác.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setError('Vui lòng nhập địa chỉ');
      return;
    }

    setGeocoding(true);
    setError('');
    setMethod('address');

    try {
      const result = await geocodeAddress(address);
      setLocation({ latitude: result.latitude, longitude: result.longitude });
      setLocationInfo({ ...result, method: 'Địa chỉ' });
    } catch (error) {
      setError(error.message || 'Không thể tìm tọa độ từ địa chỉ');
    } finally {
      setGeocoding(false);
    }
  };

  const handleManualInput = () => {
    setMethod('manual');
    setError('');
  };

  const handleCoordinateChange = (field, value) => {
    setLocation(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = () => {
    if (method === 'manual') {
      const validation = validateCoordinates(location.latitude, location.longitude);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
      onLocationSelected({
        latitude: validation.latitude,
        longitude: validation.longitude,
        source: 'MANUAL',
      });
    } else if (location.latitude && location.longitude) {
      onLocationSelected({
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        source: locationInfo?.source || method.toUpperCase(),
      });
    } else {
      setError('Vui lòng chọn hoặc nhập vị trí');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-blue-600 mb-4">Chọn Vị Trí Điểm Danh</h3>

        {/* Location Methods */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phương thức lấy vị trí:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={handleGPS}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                method === 'gps'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📍 GPS
            </button>
            <button
              onClick={handleIP}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                method === 'ip'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌐 IP/WiFi
            </button>
            <button
              onClick={() => setMethod('address')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                method === 'address'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏠 Địa Chỉ
            </button>
            <button
              onClick={handleManualInput}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                method === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✏️ Thủ Công
            </button>
          </div>
        </div>

        {/* Address Input */}
        {method === 'address' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhập địa chỉ (ví dụ: "Trường Đại học Bách Khoa, Hà Nội"):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleGeocodeAddress();
                  }
                }}
              />
              <button
                onClick={handleGeocodeAddress}
                disabled={geocoding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {geocoding ? 'Đang tìm...' : 'Tìm'}
              </button>
            </div>
          </div>
        )}

        {/* Manual Coordinate Input */}
        {method === 'manual' && (
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vĩ độ (Latitude):
              </label>
              <input
                type="number"
                step="any"
                value={location.latitude}
                onChange={e => handleCoordinateChange('latitude', e.target.value)}
                placeholder="21.0285"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kinh độ (Longitude):
              </label>
              <input
                type="number"
                step="any"
                value={location.longitude}
                onChange={e => handleCoordinateChange('longitude', e.target.value)}
                placeholder="105.8542"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 text-sm text-gray-600">
              💡 Bạn có thể lấy tọa độ từ{' '}
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Maps
              </a>{' '}
              bằng cách click chuột phải vào vị trí và chọn tọa độ
            </div>
          </div>
        )}

        {/* Current Location Display */}
        {location.latitude && location.longitude && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-green-800">Vị trí đã chọn:</span>
              {locationInfo?.method && (
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                  {locationInfo.method}
                </span>
              )}
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>
                <span className="font-medium">Tọa độ:</span>{' '}
                {parseFloat(location.latitude).toFixed(6)},{' '}
                {parseFloat(location.longitude).toFixed(6)}
              </p>
              {locationInfo?.displayName && (
                <p>
                  <span className="font-medium">Địa chỉ:</span> {locationInfo.displayName}
                </p>
              )}
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                🗺️ Xem trên Google Maps
              </a>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-4 text-center">
            <p className="text-gray-600">Đang lấy vị trí...</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!location.latitude || !location.longitude || loading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Xác Nhận
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;
