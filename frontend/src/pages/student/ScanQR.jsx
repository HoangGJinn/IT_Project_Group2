import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { FaQrcode, FaCamera, FaCheckCircle, FaTimesCircle, FaKeyboard } from 'react-icons/fa';
import api from '../../utils/api';

function ScanQR() {
  const [searchParams] = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  // Check if token is in URL (from QR code scan)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      processQRCode(token);
    }
  }, [searchParams]);

  const html5QrCodeRef = useRef(null);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      // Initialize Html5Qrcode
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      // Start scanning
      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText, decodedResult) => {
          // Successfully scanned
          processQRCode(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      ).catch((err) => {
        console.error('Error starting scanner:', err);
        setError('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập camera.');
        setIsScanning(false);
      });
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera.');
      console.error('Error accessing camera:', err);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    setIsScanning(false);
    setScanResult(null);
    setError(null);
  };

  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualInput = () => {
    setShowManualInput(true);
  };

  const handleSubmitManualInput = () => {
    if (manualInput.trim()) {
      processQRCode(manualInput.trim());
      setManualInput('');
      setShowManualInput(false);
    }
  };

  const processQRCode = async code => {
    try {
      // Stop scanning first
      await stopScanning();
      
      // Extract token from URL if it's a full URL
      let token = code;
      if (code.includes('token=')) {
        try {
          const url = new URL(code);
          token = url.searchParams.get('token') || code;
        } catch (e) {
          // If URL parsing fails, use the code as is
          token = code;
        }
      }

      // Detect if device is mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Get GPS location
      let latitude = null;
      let longitude = null;
      let locationAccuracy = null;
      let locationWarning = null;
      
      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Trình duyệt không hỗ trợ định vị'));
            return;
          }
          
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            }
          );
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        locationAccuracy = position.coords.accuracy; // Accuracy in meters
        
        // Check if accuracy is too low (likely IP geolocation on desktop)
        if (!isMobile && locationAccuracy > 1000) {
          locationWarning = 'Cảnh báo: Vị trí có thể không chính xác trên máy tính. Vui lòng sử dụng điện thoại để điểm danh chính xác hơn.';
        } else if (locationAccuracy > 500) {
          locationWarning = 'Cảnh báo: Độ chính xác vị trí thấp. Vui lòng kiểm tra lại.';
        }
      } catch (geoError) {
        // If location is required by backend, it will return an error
        if (!isMobile) {
          locationWarning = 'Máy tính không có GPS. Vui lòng sử dụng điện thoại để điểm danh hoặc liên hệ giáo viên.';
        }
        console.warn('Could not get location:', geoError);
      }
      
      // Show warning if on desktop and location is required
      if (locationWarning && !isMobile) {
        const proceed = window.confirm(`${locationWarning}\n\nBạn có muốn tiếp tục điểm danh không?`);
        if (!proceed) {
          setScanResult({
            success: false,
            message: 'Điểm danh đã bị hủy. Vui lòng sử dụng điện thoại để điểm danh.'
          });
          return;
        }
      }

      const response = await api.post('/student/attendance/scan', {
        token: token,
        ...(latitude && longitude ? { latitude, longitude } : {})
      });

      if (response.data.success) {
        setScanResult({
          success: true,
          message: response.data.message || 'Điểm danh thành công!',
          classInfo: {
            subject: response.data.data?.class_info?.name || 'N/A',
            classCode: response.data.data?.class_info?.class_code || 'N/A',
            status: response.data.data?.status || 'PRESENT',
            checkinTime: response.data.data?.checkin_time 
              ? new Date(response.data.data.checkin_time).toLocaleString('vi-VN')
              : new Date().toLocaleString('vi-VN'),
          },
        });
      } else {
        setScanResult({
          success: false,
          message: response.data.message || 'Điểm danh thất bại',
        });
      }
    } catch (error) {
      console.error('Scan QR error:', error);
      setScanResult({
        success: false,
        message: error.response?.data?.message || 'Mã QR không hợp lệ hoặc đã hết hạn',
      });
    }
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-blue-600 flex items-center gap-2">
        <FaQrcode className="text-3xl" />
        Quét Mã Điểm Danh
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        {!isScanning && !scanResult && (
          <div className="text-center py-12">
            <div className="mb-6">
              <FaQrcode className="text-8xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-8">
                Nhấn nút bên dưới để bắt đầu quét mã QR điểm danh
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startScanning}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <FaCamera className="text-xl" />
                Bắt Đầu Quét
              </button>
              <button
                onClick={handleManualInput}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold flex items-center justify-center gap-2"
              >
                <FaKeyboard className="text-xl" />
                Nhập Mã Thủ Công
              </button>
            </div>
          </div>
        )}

        {isScanning && (
          <div>
            <div className="relative mb-4">
              <div id="qr-reader" className="w-full rounded-lg border-2 border-blue-500 overflow-hidden"></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-blue-500 rounded-lg w-64 h-64"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">Đưa mã QR vào khung hình để quét</p>
              <button
                onClick={stopScanning}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                Dừng Quét
              </button>
            </div>
          </div>
        )}

        {showManualInput && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">Nhập Mã QR Thủ Công</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                placeholder="Nhập mã QR hoặc URL..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleSubmitManualInput();
                  }
                }}
              />
              <button
                onClick={handleSubmitManualInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Xác Nhận
              </button>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualInput('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <FaTimesCircle className="text-xl" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {scanResult && (
          <div
            className={`rounded-lg p-6 ${
              scanResult.success
                ? 'bg-green-50 border-2 border-green-200'
                : 'bg-red-50 border-2 border-red-200'
            }`}
          >
            <div className="text-center">
              {scanResult.success ? (
                <FaCheckCircle className="text-6xl text-green-600 mx-auto mb-4" />
              ) : (
                <FaTimesCircle className="text-6xl text-red-600 mx-auto mb-4" />
              )}
              <h3
                className={`text-2xl font-semibold mb-4 ${
                  scanResult.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {scanResult.message}
              </h3>

              {scanResult.success && scanResult.classInfo && (
                <div className="bg-white rounded-lg p-4 mt-4 text-left">
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">Môn học/Lớp:</span> {scanResult.classInfo.subject}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">Mã lớp:</span> {scanResult.classInfo.classCode}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">Trạng thái:</span>{' '}
                    <span className={`font-semibold ${
                      scanResult.classInfo.status === 'PRESENT' ? 'text-green-600' :
                      scanResult.classInfo.status === 'LATE' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {scanResult.classInfo.status === 'PRESENT' ? '✅ Có mặt' :
                       scanResult.classInfo.status === 'LATE' ? '⏰ Đi muộn' :
                       scanResult.classInfo.status}
                    </span>
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Thời gian điểm danh:</span> {scanResult.classInfo.checkinTime}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setScanResult(null);
                  setError(null);
                }}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Quét Lại
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Hướng dẫn:</h3>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
            <li>Đảm bảo camera có đủ ánh sáng</li>
            <li>Đưa mã QR vào khung hình và giữ yên</li>
            <li>Mã QR chỉ có hiệu lực trong thời gian quy định</li>
            <li>Nếu không quét được, có thể nhập mã thủ công</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ScanQR;
