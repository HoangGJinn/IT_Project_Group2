import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

function TeachingSchedule() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // QR Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [showQRDurationModal, setShowQRDurationModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingQRParams, setPendingQRParams] = useState(null);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState(null);
  const [qrData, setQrData] = useState({
    token: '',
    url: '',
    expiresAt: null,
    locationRadius: 10,
    teacherLatitude: null,
    teacherLongitude: null,
    sessionInfo: null,
  });

  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  // Color palette for different classes
  const colors = [
    'bg-blue-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-orange-600',
    'bg-red-600',
    'bg-indigo-600',
    'bg-pink-600',
    'bg-teal-600',
  ];

  // Get week start (Monday) and end (Sunday)
  const getWeekRange = date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      monday: monday,
    };
  };

  // Load schedule data
  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError('');
      const weekRange = getWeekRange(currentWeek);

      const response = await api.get('/schedule', {
        params: {
          week_start: weekRange.start,
          week_end: weekRange.end,
        },
      });

      if (response.data.success) {
        // Convert API response to display format
        const scheduleData = {};
        response.data.data.schedule.forEach(dayData => {
          scheduleData[dayData.day] = dayData.sessions || [];
        });
        setSchedule(scheduleData);
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
      setError('Không thể tải lịch dạy. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [currentWeek]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // Format date for display
  const formatWeekRange = date => {
    const weekRange = getWeekRange(date);
    const start = weekRange.monday;
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatDate = d => {
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    return `${formatDate(start)} - ${formatDate(end)}/${start.getMonth() + 1}/${start.getFullYear()}`;
  };

  // Get color for a class (consistent based on class_id)
  const getClassColor = classId => {
    return colors[classId % colors.length];
  };

  // Handle session click - create QR if session exists, otherwise navigate to class detail
  const handleSessionClick = async session => {
    // If session has session_id, try to create QR
    if (session.session_id) {
      setSelectedSessionForQR(session);
      setShowQRDurationModal(true);
    } else {
      // If no session_id, navigate to class detail to create session first
      navigate(`/classes/${session.class_id}`);
    }
  };

  // Create QR code
  const handleCreateQR = async (lateAfterMinutes, locationRadius) => {
    if (!selectedSessionForQR || !selectedSessionForQR.session_id) {
      return;
    }

    // Store QR parameters and show location picker
    setPendingQRParams({ lateAfterMinutes, locationRadius });
    setShowLocationPicker(true);
  };

  // Handle location selected from LocationPicker
  const handleLocationSelected = async location => {
    if (!selectedSessionForQR || !pendingQRParams) {
      return;
    }

    setShowLocationPicker(false);

    try {
      const response = await api.post(
        `/sessions/${selectedSessionForQR.session_id}/attendance/start`,
        {
          method: 'QR',
          late_after_minutes: parseInt(pendingQRParams.lateAfterMinutes),
          latitude: location.latitude,
          longitude: location.longitude,
          location_radius: parseInt(pendingQRParams.locationRadius) || 10,
        }
      );

      if (response.data.success) {
        const qrToken = response.data.data.qr_token;
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port || (protocol === 'https:' ? '443' : '80');

        const qrURL = `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}/student/scan?token=${qrToken}`;

        setQrData({
          token: qrToken,
          url: qrURL,
          expiresAt: response.data.data.expires_at,
          locationRadius: pendingQRParams.locationRadius || 10,
          teacherLatitude: response.data.data.teacher_latitude || location.latitude,
          teacherLongitude: response.data.data.teacher_longitude || location.longitude,
          sessionInfo: {
            date: selectedSessionForQR.date,
            time: `${selectedSessionForQR.start_time || ''}${selectedSessionForQR.end_time ? ` - ${selectedSessionForQR.end_time}` : ''}`,
            room: selectedSessionForQR.room || 'Chưa có',
            topic: selectedSessionForQR.topic || 'Chưa có',
            class_code: selectedSessionForQR.class_code,
            course_name: selectedSessionForQR.course_name,
          },
        });
        setShowQRModal(true);
        setShowQRDurationModal(false);
        setSelectedSessionForQR(null);
        setPendingQRParams(null);
        loadSchedule(); // Refresh schedule
      }
    } catch (error) {
      console.error('Create QR error:', error);
      alert(error.response?.data?.message || 'Tạo QR code thất bại');
    }
  };

  const handleLocationPickerCancel = () => {
    setShowLocationPicker(false);
    setPendingQRParams(null);
  };

  return (
    <div>
      {/* Header with Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-blue-600 mb-1">Lịch Dạy Của Tôi</h2>
          <p className="text-gray-600 text-sm">Tuần: {formatWeekRange(currentWeek)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition disabled:opacity-50"
            title="Tuần trước"
          >
            ←
          </button>
          <button
            onClick={goToCurrentWeek}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            Tuần này
          </button>
          <button
            onClick={goToNextWeek}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition disabled:opacity-50"
            title="Tuần sau"
          >
            →
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {daysOfWeek.map((day, index) => {
            const weekRange = getWeekRange(currentWeek);
            const dayDate = new Date(weekRange.monday);
            dayDate.setDate(dayDate.getDate() + index);
            const dayNumber = dayDate.getDate();
            const isToday = dayDate.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`p-4 text-center font-semibold border-r border-gray-200 last:border-r-0 ${
                  isToday ? 'bg-blue-100' : ''
                }`}
              >
                <div className="text-gray-600 text-sm">{day}</div>
                <div className={`text-lg ${isToday ? 'text-blue-600 font-bold' : 'text-gray-800'}`}>
                  {dayNumber}
                </div>
              </div>
            );
          })}
        </div>

        {/* Schedule Content */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2">Đang tải lịch dạy...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-[400px]">
            {daysOfWeek.map((day, dayIndex) => {
              const sessions = schedule[dayIndex] || [];
              const isEmpty = sessions.length === 0;

              return (
                <div
                  key={dayIndex}
                  className={`min-h-[400px] p-2 border-r border-b border-gray-200 last:border-r-0 ${
                    isEmpty ? 'bg-gray-50' : ''
                  }`}
                >
                  {isEmpty ? (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      Không có lịch
                    </div>
                  ) : (
                    sessions.map((session, index) => {
                      // All sessions should have normal color now (is_scheduled is always true for scheduled items)
                      const bgColor = getClassColor(session.class_id);

                      return (
                        <div
                          key={
                            session.session_id ||
                            `scheduled-${session.class_id}-${session.date}-${index}`
                          }
                          className={`${bgColor} text-white p-3 rounded mb-2 text-sm cursor-pointer hover:opacity-90 transition shadow-sm`}
                          onClick={() => handleSessionClick(session)}
                          title={
                            session.session_id
                              ? 'Click để tạo QR điểm danh'
                              : 'Click để xem chi tiết lớp'
                          }
                        >
                          <p className="font-semibold mb-1 truncate">{session.course_name}</p>
                          <p className="text-xs opacity-90 mb-1">{session.course_code}</p>
                          <p className="text-xs mb-1">Lớp: {session.class_code}</p>
                          {session.class_name && (
                            <p className="text-xs opacity-75 mb-1 truncate">{session.class_name}</p>
                          )}
                          <p className="text-xs mb-1">Phòng: {session.room}</p>
                          {session.start_time && (
                            <p className="text-xs mb-1">
                              {session.start_time}
                              {session.end_time && ` - ${session.end_time}`}
                            </p>
                          )}
                          {session.periods && (
                            <p className="text-xs opacity-90">Tiết: {session.periods}</p>
                          )}
                          {session.topic && (
                            <p className="text-xs opacity-75 mt-1 truncate" title={session.topic}>
                              📝 {session.topic}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      {!loading && Object.keys(schedule).some(day => schedule[day]?.length > 0) && (
        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-2">
            💡 Click vào từng buổi học để tạo QR điểm danh hoặc xem chi tiết lớp học
          </p>
        </div>
      )}

      {/* QR Late After Modal */}
      {showQRDurationModal && selectedSessionForQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-blue-600 mb-4">Tạo QR Code Điểm Danh</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thời gian cho phép đi muộn (phút)
                </label>
                <select
                  id="qrLateAfterSelect"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="15"
                >
                  <option value="5">5 phút</option>
                  <option value="10">10 phút</option>
                  <option value="15">15 phút</option>
                  <option value="20">20 phút</option>
                  <option value="30">30 phút</option>
                  <option value="45">45 phút</option>
                  <option value="60">60 phút</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Sau thời gian này, học sinh quét QR sẽ được tính là đi muộn. QR code sẽ tồn tại
                  đến khi buổi học kết thúc.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bán kính cho phép điểm danh (mét)
                </label>
                <select
                  id="qrLocationRadiusSelect"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue="10"
                >
                  <option value="5">5 mét</option>
                  <option value="6">6 mét</option>
                  <option value="7">7 mét</option>
                  <option value="8">8 mét</option>
                  <option value="9">9 mét</option>
                  <option value="10">10 mét</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Học sinh phải ở trong bán kính này so với vị trí của bạn (giáo viên) để điểm danh
                  hợp lệ. Hệ thống sẽ yêu cầu GPS khi tạo QR.
                </p>
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowQRDurationModal(false);
                    setSelectedSessionForQR(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    const lateAfter = document.getElementById('qrLateAfterSelect').value;
                    const locationRadius = document.getElementById('qrLocationRadiusSelect').value;
                    handleCreateQR(lateAfter, locationRadius);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Tạo QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-600">QR Code Điểm Danh</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Session Info */}
              {qrData.sessionInfo && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Thông tin buổi học:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>📚 Môn: {qrData.sessionInfo.course_name}</p>
                    <p>📅 Ngày: {new Date(qrData.sessionInfo.date).toLocaleDateString('vi-VN')}</p>
                    <p>🕐 Thời gian: {qrData.sessionInfo.time}</p>
                    <p>📍 Phòng: {qrData.sessionInfo.room}</p>
                    {qrData.sessionInfo.topic && <p>📝 Chủ đề: {qrData.sessionInfo.topic}</p>}
                  </div>
                </div>
              )}

              {/* QR Code Display */}
              <div className="flex justify-center bg-white p-6 rounded-lg border-2 border-gray-200">
                {qrData.url && (
                  <QRCodeSVG
                    value={qrData.url}
                    size={256}
                    level="H"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                )}
              </div>

              {/* URL Display with Copy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Điểm Danh
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrData.url}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrData.url);
                      alert('✅ Đã copy URL!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap"
                    title="Copy URL"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Token Display with Copy */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token (Mã QR)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrData.token}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(qrData.token);
                      alert('✅ Đã copy Token!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap"
                    title="Copy Token"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Teacher GPS Location */}
              {qrData.teacherLatitude && qrData.teacherLongitude && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">📍 Vị trí GPS nơi tạo QR:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`https://www.google.com/maps?q=${qrData.teacherLatitude},${qrData.teacherLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                      >
                        🗺️ Xem trên Google Maps
                      </a>
                    </div>
                    <div className="text-sm text-blue-700">
                      <p>
                        <span className="font-medium">Tọa độ:</span>{' '}
                        {parseFloat(qrData.teacherLatitude).toFixed(6)},{' '}
                        {parseFloat(qrData.teacherLongitude).toFixed(6)}
                      </p>
                      <p>
                        <span className="font-medium">Bán kính cho phép:</span>{' '}
                        {qrData.locationRadius || 10}m
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expires At */}
              {qrData.expiresAt && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    ⏰ QR code sẽ hết hạn khi buổi học kết thúc:{' '}
                    <span className="font-semibold">
                      {new Date(qrData.expiresAt).toLocaleString('vi-VN')}
                    </span>
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">📱 Hướng dẫn:</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Sinh viên có thể quét QR code này bằng camera điện thoại</li>
                  <li>Hoặc truy cập URL để điểm danh</li>
                  <li>Hoặc nhập token thủ công trong ứng dụng</li>
                  <li>QR code sẽ tồn tại đến khi buổi học kết thúc</li>
                  <li>
                    <strong>⚠️ Lưu ý:</strong> Học sinh phải bật GPS và ở trong bán kính{' '}
                    {qrData.locationRadius || 10}m so với vị trí của bạn để điểm danh hợp lệ
                  </li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowQRModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelected={handleLocationSelected}
          onCancel={handleLocationPickerCancel}
        />
      )}
    </div>
  );
}

export default TeachingSchedule;
