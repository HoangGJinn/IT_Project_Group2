import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaQrcode, FaCamera, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import api from '../../utils/api';

function ScanQR() {
  const [searchParams] = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check if token is in URL (from QR code scan)
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      processQRCode(token);
    }
  }, [searchParams]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Sử dụng camera sau
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        setError(null);
      }
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng cho phép quyền truy cập camera.');
      console.error('Error accessing camera:', err);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setScanResult(null);
    setError(null);
  };

  const handleManualInput = () => {
    const qrCode = prompt('Nhập mã QR điểm danh:');
    if (qrCode) {
      processQRCode(qrCode);
    }
  };

  const processQRCode = async code => {
    try {
      // Extract token from URL if it's a full URL
      let token = code;
      if (code.includes('token=')) {
        const url = new URL(code);
        token = url.searchParams.get('token') || code;
      }

      const response = await api.post('/student/attendance/scan', {
        token: token,
      });

      if (response.data.success) {
        setScanResult({
          success: true,
          message: response.data.message || 'Điểm danh thành công!',
          classInfo: {
            subject: response.data.data?.class?.name || response.data.data?.class?.course?.name,
            classCode: response.data.data?.class?.class_code,
            session: response.data.data?.session?.session_number || 'N/A',
            time: new Date().toLocaleString('vi-VN'),
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
    } finally {
      stopScanning();
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
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Nhập Mã Thủ Công
              </button>
            </div>
          </div>
        )}

        {isScanning && (
          <div>
            <div className="relative mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-blue-500"
                style={{ maxHeight: '500px' }}
              />
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
                    <span className="font-semibold">Môn học:</span> {scanResult.classInfo.subject}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">Mã lớp:</span> {scanResult.classInfo.classCode}
                  </p>
                  <p className="text-gray-700 mb-2">
                    <span className="font-semibold">Buổi học:</span> {scanResult.classInfo.session}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Thời gian:</span> {scanResult.classInfo.time}
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
