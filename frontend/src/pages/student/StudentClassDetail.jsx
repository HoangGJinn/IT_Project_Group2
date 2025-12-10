import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaCalendar,
  FaClock,
  FaMapMarkerAlt,
  FaChartLine,
  FaCheckCircle,
  FaTimesCircle,
  FaCamera,
  FaKeyboard,
} from 'react-icons/fa';
import api from '../../utils/api';
import { formatScheduleDays, formatSchedulePeriods } from '../../utils/schedule';
import LocationPicker from '../../components/LocationPicker';

function StudentClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [classInfo, setClassInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // QR Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAttendanceInfoModal, setShowAttendanceInfoModal] = useState(false);
  const [showCheckInResultModal, setShowCheckInResultModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingCheckInToken, setPendingCheckInToken] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);

  useEffect(() => {
    fetchClassDetail();
  }, [id]);

  const fetchClassDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/student/classes/${id}`);
      if (response.data.success) {
        const data = response.data.data;
        setClassInfo({
          id: data.class_id,
          name: data.name || data.course?.name,
          code: data.class_code,
          teacher: data.teacher?.user?.full_name || 'Chưa có',
          day: formatScheduleDays(data.schedule_days),
          period: formatSchedulePeriods(data.schedule_periods),
          room: data.room || 'Chưa có',
          totalSessions: data.attendance_stats?.total_sessions || 0,
          attendedSessions: data.attendance_stats?.attended_sessions || 0,
          attendanceRate: data.attendance_stats?.attendance_rate || '0%',
          validSessions: data.attendance_stats?.valid_sessions || 0,
          invalidSessions: data.attendance_stats?.invalid_sessions || 0,
          pendingSessions: data.attendance_stats?.pending_sessions || 0,
          validRate: data.attendance_stats?.valid_rate || '0%',
          invalidRate: data.attendance_stats?.invalid_rate || '0%',
          description: data.course?.description || 'Chưa có mô tả',
        });
        setSessions(data.sessions || []);
        // Fetch materials
        fetchMaterials();
      }
    } catch (error) {
      console.error('Fetch class detail error:', error);
      setError(error.response?.data?.message || 'Không thể tải thông tin lớp học');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const response = await api.get(`/materials/classes/${id}`);
      if (response.data.success) {
        setMaterials(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch materials error:', error);
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const formatFileSize = bytes => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const getFileIcon = fileType => {
    if (!fileType) return '📄';
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return '📕';
    if (type.includes('word') || type.includes('doc')) return '📘';
    if (type.includes('excel') || type.includes('xls')) return '📗';
    if (type.includes('powerpoint') || type.includes('ppt')) return '📙';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📄';
  };

  // Handle session click - show QR or attendance info
  const handleSessionClick = session => {
    // Calculate session status
    const now = new Date();
    const sessionDate = new Date(session.date);
    const [startHour, startMinute] = (session.start_time || '00:00').split(':').map(Number);
    const sessionStartTime = new Date(sessionDate);
    sessionStartTime.setHours(startHour, startMinute, 0, 0);

    let sessionEndTime = null;
    if (session.end_time) {
      const [endHour, endMinute] = session.end_time.split(':').map(Number);
      sessionEndTime = new Date(sessionDate);
      sessionEndTime.setHours(endHour, endMinute, 0, 0);
    } else {
      sessionEndTime = new Date(sessionStartTime);
      sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
    }

    // Determine real-time status
    let realTimeStatus = session.status;
    if (session.status !== 'CANCELLED') {
      if (now < sessionStartTime) {
        realTimeStatus = 'UPCOMING';
      } else if (now >= sessionStartTime && (!sessionEndTime || now < sessionEndTime)) {
        realTimeStatus = 'ONGOING';
      } else if (sessionEndTime && now >= sessionEndTime) {
        realTimeStatus = 'FINISHED';
      }
    }

    setSelectedSession(session);

    // If session hasn't started - don't show anything
    if (realTimeStatus === 'UPCOMING') {
      return;
    }

    // If session is finished - show attendance info
    if (realTimeStatus === 'FINISHED') {
      setShowAttendanceInfoModal(true);
      return;
    }

    // If session is ongoing - show attendance options
    if (realTimeStatus === 'ONGOING') {
      setShowQRModal(true);
      return;
    }
  };

  // Handle attendance check-in
  const handleCheckIn = async token => {
    try {
      // Get GPS location - Optional, but if not available, reason is required
      let latitude = null;
      let longitude = null;
      let locationAccuracy = null;
      let gpsAvailable = false;

      try {
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          locationAccuracy = position.coords.accuracy;
          gpsAvailable = true;

          // Check if accuracy is too low
          if (locationAccuracy > 500) {
            const useLowAccuracy = window.confirm(
              `Cảnh báo: Độ chính xác vị trí thấp (${Math.round(locationAccuracy)}m). Điểm danh có thể thất bại nếu bạn không ở gần giáo viên.\n\nBạn có muốn tiếp tục với GPS này không?`
            );
            if (!useLowAccuracy) {
              gpsAvailable = false;
              latitude = null;
              longitude = null;
            }
          }
        }
      } catch (geoError) {
        // GPS not available - will require reason
        gpsAvailable = false;
        console.warn('GPS not available:', geoError);
      }

      // If no GPS, show location picker
      if (!gpsAvailable) {
        setPendingCheckInToken(token);
        setShowLocationPicker(true);
        return;
      }

      // GPS available - proceed with location check
      const response = await api.post('/student/attendance/scan', {
        token: token,
        latitude: latitude,
        longitude: longitude,
      });

      if (response.data.success) {
        const data = response.data.data;
        setCheckInResult({
          success: true,
          message: response.data.message || 'Điểm danh thành công!',
          status: data?.status || 'PRESENT',
          checkinTime: data?.checkin_time
            ? new Date(data.checkin_time).toLocaleString('vi-VN')
            : new Date().toLocaleString('vi-VN'),
          is_valid: data?.is_valid,
          no_gps_reason: data?.no_gps_reason,
          latitude: data?.latitude,
          longitude: data?.longitude,
          classInfo: data?.class_info,
        });
        setShowQRModal(false);
        setShowManualInput(false);
        setShowCheckInResultModal(true);
        fetchClassDetail(); // Refresh to show updated attendance status
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Điểm danh thất bại';
      alert(errorMessage);
    }
  };

  // Handle location selected from LocationPicker
  const handleLocationSelected = async location => {
    if (!pendingCheckInToken) {
      return;
    }

    setShowLocationPicker(false);
    const token = pendingCheckInToken;
    setPendingCheckInToken(null);

    try {
      const response = await api.post('/student/attendance/scan', {
        token: token,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (response.data.success) {
        const data = response.data.data;
        setCheckInResult({
          success: true,
          message: response.data.message || 'Điểm danh thành công!',
          status: data?.status || 'PRESENT',
          checkinTime: data?.checkin_time
            ? new Date(data.checkin_time).toLocaleString('vi-VN')
            : new Date().toLocaleString('vi-VN'),
          is_valid: data?.is_valid,
          no_gps_reason: data?.no_gps_reason,
          latitude: data?.latitude,
          longitude: data?.longitude,
          classInfo: data?.class_info,
        });
        setShowQRModal(false);
        setShowManualInput(false);
        setShowCheckInResultModal(true);
        fetchClassDetail();
      } else {
        alert(response.data.message || 'Điểm danh thất bại');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Điểm danh thất bại';
      alert(errorMessage);
    }
  };

  const handleLocationPickerCancel = () => {
    // If user cancels, ask for reason
    setShowLocationPicker(false);
    const reason = window.prompt(
      'Bạn không có GPS hoặc GPS không khả dụng. Vui lòng nhập lý do hợp lệ (ví dụ: "Điện thoại không có GPS", "GPS bị lỗi", "Đang ở trong nhà GPS yếu", v.v.):\n\nLý do:'
    );

    if (!reason || reason.trim().length === 0) {
      alert('Vui lòng cung cấp lý do khi không thể sử dụng GPS để điểm danh.');
      setPendingCheckInToken(null);
      return;
    }

    // Use reason for attendance
    if (pendingCheckInToken) {
      api
        .post('/student/attendance/scan', {
          token: pendingCheckInToken,
          no_gps_reason: reason.trim(),
        })
        .then(response => {
          if (response.data.success) {
            const data = response.data.data;
            setCheckInResult({
              success: true,
              message:
                response.data.message ||
                'Điểm danh thành công! Lý do của bạn đã được ghi nhận và sẽ được giáo viên xem xét.',
              status: data?.status || 'PRESENT',
              checkinTime: data?.checkin_time
                ? new Date(data.checkin_time).toLocaleString('vi-VN')
                : new Date().toLocaleString('vi-VN'),
              is_valid: data?.is_valid,
              no_gps_reason: data?.no_gps_reason,
              latitude: data?.latitude,
              longitude: data?.longitude,
              classInfo: data?.class_info,
            });
            setShowQRModal(false);
            setShowManualInput(false);
            setShowCheckInResultModal(true);
            fetchClassDetail();
          } else {
            alert(response.data.message || 'Điểm danh thất bại');
          }
        })
        .catch(error => {
          console.error('Check-in error:', error);
          const errorMessage =
            error.response?.data?.message || error.message || 'Điểm danh thất bại';
          alert(errorMessage);
        });
    }
    setPendingCheckInToken(null);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Không tìm thấy lớp học</p>
      </div>
    );
  }

  return (
    <div>
      {/* Class Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 mb-6 text-white">
        <h1 className="text-3xl font-bold mb-4">{classInfo.name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <span className="font-semibold">Mã lớp:</span> {classInfo.code}
            </p>
            <p className="flex items-center gap-2">
              <FaUser className="text-lg" />
              <span className="font-semibold">Giảng viên:</span> {classInfo.teacher}
            </p>
            <p className="flex items-center gap-2">
              <FaCalendar className="text-lg" />
              <span className="font-semibold">Lịch học:</span> {classInfo.day}
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <FaClock className="text-lg" />
              <span className="font-semibold">Tiết:</span> {classInfo.period}
            </p>
            <p className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-lg" />
              <span className="font-semibold">Phòng:</span> {classInfo.room}
            </p>
            <p className="flex items-center gap-2">
              <FaChartLine className="text-lg" />
              <span className="font-semibold">Tỉ lệ chuyên cần:</span> {classInfo.attendanceRate}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'info'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Thông Tin Lớp
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'upcoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Buổi Học Sắp Tới
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'finished'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Buổi Học Đã Học
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'materials'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Tài Liệu
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Thông Tin Chi Tiết</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Thống Kê Điểm Danh</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-700">Tổng số buổi:</span>
                  <span className="font-semibold text-blue-600">{classInfo.totalSessions}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">Đã tham gia:</span>
                  <span className="font-semibold text-green-600">{classInfo.attendedSessions}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                  <span className="text-gray-700">Vắng mặt:</span>
                  <span className="font-semibold text-yellow-600">
                    {classInfo.totalSessions - classInfo.attendedSessions}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-gray-700">Tỉ lệ chuyên cần:</span>
                  <span className="font-semibold text-purple-600">{classInfo.attendanceRate}</span>
                </div>
                {classInfo.validSessions !== undefined && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Điểm danh hợp lệ:</span>
                      <span className="font-semibold text-green-600">
                        {classInfo.validSessions} ({classInfo.validRate || '0%'})
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Điểm danh không hợp lệ:</span>
                      <span className="font-semibold text-red-600">
                        {classInfo.invalidSessions} ({classInfo.invalidRate || '0%'})
                      </span>
                    </div>
                    {classInfo.pendingSessions > 0 && (
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <span className="text-gray-700">Chờ đánh giá:</span>
                        <span className="font-semibold text-yellow-600">
                          {classInfo.pendingSessions}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Thông Tin Khác</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Mô tả môn học</p>
                  <p className="text-gray-800">{classInfo.description}</p>
                </div>
                {(() => {
                  // Find next session (prioritize ONGOING, then UPCOMING)
                  const now = new Date();

                  // Calculate real-time status for each session
                  const sessionsWithStatus = sessions
                    .filter(session => session.status !== 'CANCELLED')
                    .map(session => {
                      const sessionDate = new Date(session.date);
                      const [startHour, startMinute] = (session.start_time || '00:00')
                        .split(':')
                        .map(Number);
                      const sessionStartTime = new Date(sessionDate);
                      sessionStartTime.setHours(startHour, startMinute, 0, 0);

                      let sessionEndTime = null;
                      if (session.end_time) {
                        const [endHour, endMinute] = session.end_time.split(':').map(Number);
                        sessionEndTime = new Date(sessionDate);
                        sessionEndTime.setHours(endHour, endMinute, 0, 0);
                      } else {
                        sessionEndTime = new Date(sessionStartTime);
                        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
                      }

                      let realTimeStatus = session.status;
                      if (session.status !== 'CANCELLED') {
                        if (now < sessionStartTime) {
                          realTimeStatus = 'UPCOMING';
                        } else if (
                          now >= sessionStartTime &&
                          (!sessionEndTime || now < sessionEndTime)
                        ) {
                          realTimeStatus = 'ONGOING';
                        } else if (sessionEndTime && now >= sessionEndTime) {
                          realTimeStatus = 'FINISHED';
                        }
                      }

                      return {
                        ...session,
                        realTimeStatus,
                        sessionStartTime,
                        sessionEndTime,
                      };
                    });

                  // Find ONGOING session first
                  const ongoingSession = sessionsWithStatus.find(
                    s => s.realTimeStatus === 'ONGOING'
                  );

                  // If no ONGOING, find next UPCOMING
                  const nextSession =
                    ongoingSession ||
                    sessionsWithStatus
                      .filter(s => s.realTimeStatus === 'UPCOMING')
                      .sort((a, b) => {
                        const dateA = new Date(`${a.date} ${a.start_time || '00:00'}`);
                        const dateB = new Date(`${b.date} ${b.start_time || '00:00'}`);
                        return dateA - dateB;
                      })[0];

                  if (nextSession) {
                    const sessionDate = new Date(nextSession.date);
                    const dayName = [
                      'Chủ Nhật',
                      'Thứ 2',
                      'Thứ 3',
                      'Thứ 4',
                      'Thứ 5',
                      'Thứ 6',
                      'Thứ 7',
                    ][sessionDate.getDay()];

                    const isOngoing = nextSession.realTimeStatus === 'ONGOING';

                    return (
                      <div
                        onClick={() => {
                          setSelectedSessionDetail(nextSession);
                          setShowSessionDetailModal(true);
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${isOngoing ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                      >
                        <p
                          className={`text-sm font-semibold mb-2 ${isOngoing ? 'text-green-800' : 'text-blue-800'}`}
                        >
                          {isOngoing ? '🟢 Buổi học đang diễn ra' : '📅 Buổi học sắp tới gần nhất'}
                        </p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Ngày:</span>
                            <span className="font-medium text-gray-800">
                              {dayName},{' '}
                              {sessionDate.toLocaleDateString('vi-VN', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Thời gian:</span>
                            <span className="font-medium text-gray-800">
                              {nextSession.start_time}
                              {nextSession.end_time ? ` - ${nextSession.end_time}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Phòng:</span>
                            <span
                              className={`font-medium ${!nextSession.room ? 'text-gray-400 italic' : 'text-gray-800'}`}
                            >
                              {nextSession.room || 'Chưa có phòng'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-gray-600">Chủ đề:</span>
                            <span
                              className={`font-medium ${!nextSession.topic ? 'text-gray-400 italic' : 'text-gray-800'}`}
                            >
                              {nextSession.topic || 'Chưa có chủ đề'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 italic">Click để xem chi tiết</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Chưa có buổi học sắp tới</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper function to calculate session status */}
      {(() => {
        const now = new Date();
        const calculateSessionStatus = session => {
          const sessionDate = new Date(session.date);
          const [startHour, startMinute] = (session.start_time || '00:00').split(':').map(Number);
          const sessionStartTime = new Date(sessionDate);
          sessionStartTime.setHours(startHour, startMinute, 0, 0);

          let sessionEndTime = null;
          if (session.end_time) {
            const [endHour, endMinute] = session.end_time.split(':').map(Number);
            sessionEndTime = new Date(sessionDate);
            sessionEndTime.setHours(endHour, endMinute, 0, 0);
          } else {
            sessionEndTime = new Date(sessionStartTime);
            sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
          }

          let realTimeStatus = session.status;
          if (session.status !== 'CANCELLED') {
            if (now < sessionStartTime) {
              realTimeStatus = 'UPCOMING';
            } else if (now >= sessionStartTime && (!sessionEndTime || now < sessionEndTime)) {
              realTimeStatus = 'ONGOING';
            } else if (sessionEndTime && now >= sessionEndTime) {
              realTimeStatus = 'FINISHED';
            }
          }

          return {
            ...session,
            realTimeStatus,
            sessionStartTime,
            sessionEndTime,
          };
        };

        const sessionsWithStatus = sessions.map(calculateSessionStatus);

        const upcomingSessions = sessionsWithStatus
          .filter(s => {
            if (s.status === 'CANCELLED') return false;
            const status = s.realTimeStatus || s.status;
            return status === 'UPCOMING' || status === 'ONGOING' || status === 'SCHEDULED';
          })
          .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.start_time || '').localeCompare(b.start_time || '');
          });

        const finishedSessions = sessionsWithStatus
          .filter(s => {
            const status = s.realTimeStatus || s.status;
            return status === 'FINISHED' || s.status === 'FINISHED';
          })
          .sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.start_time || '').localeCompare(a.start_time || '');
          });

        return (
          <>
            {activeTab === 'upcoming' && (
              <div className="max-w-6xl mx-auto">
                {upcomingSessions.length === 0 ? (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center border-2 border-dashed border-blue-200">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-700 font-medium text-lg mb-1">
                      Chưa có buổi học sắp tới
                    </p>
                    <p className="text-gray-500 text-sm">Các buổi học sắp tới sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  (() => {
                    const today = new Date().toISOString().split('T')[0];

                    // Group sessions by week
                    const groupByWeek = sessions => {
                      const groups = {};
                      sessions.forEach(session => {
                        const sessionDate = new Date(session.date);
                        const weekStart = new Date(sessionDate);
                        weekStart.setDate(
                          sessionDate.getDate() -
                            sessionDate.getDay() +
                            (sessionDate.getDay() === 0 ? -6 : 1)
                        );
                        const weekKey = weekStart.toISOString().split('T')[0];

                        if (!groups[weekKey]) {
                          groups[weekKey] = [];
                        }
                        groups[weekKey].push(session);
                      });
                      return groups;
                    };

                    const weekGroups = groupByWeek(upcomingSessions);
                    const weekKeys = Object.keys(weekGroups).sort();

                    // Helper to get week label
                    const getWeekLabel = weekStart => {
                      const start = new Date(weekStart);
                      const end = new Date(start);
                      end.setDate(end.getDate() + 6);
                      const todayDate = new Date();
                      todayDate.setHours(0, 0, 0, 0);

                      if (start <= todayDate && todayDate <= end) {
                        return 'Tuần này';
                      }
                      const nextWeek = new Date(todayDate);
                      nextWeek.setDate(
                        todayDate.getDate() +
                          7 -
                          todayDate.getDay() +
                          (todayDate.getDay() === 0 ? -6 : 1)
                      );
                      if (start.getTime() === nextWeek.getTime()) {
                        return 'Tuần sau';
                      }
                      return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
                    };

                    // Helper to calculate days until session
                    const getDaysUntil = dateStr => {
                      const sessionDate = new Date(dateStr);
                      const todayDate = new Date();
                      todayDate.setHours(0, 0, 0, 0);
                      sessionDate.setHours(0, 0, 0, 0);
                      const diffTime = sessionDate - todayDate;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays;
                    };

                    return (
                      <div className="space-y-6">
                        {weekKeys.map(weekKey => {
                          const weekSessions = weekGroups[weekKey];
                          const weekStart = new Date(weekKey);

                          return (
                            <div
                              key={weekKey}
                              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                            >
                              {/* Week Header */}
                              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-lg">{getWeekLabel(weekKey)}</h4>
                                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                    {weekSessions.length} buổi học
                                  </span>
                                </div>
                              </div>

                              {/* Sessions in this week - Grid Layout */}
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {weekSessions.map(session => {
                                  const sessionDate = new Date(session.date);
                                  const dayName = [
                                    'Chủ Nhật',
                                    'Thứ 2',
                                    'Thứ 3',
                                    'Thứ 4',
                                    'Thứ 5',
                                    'Thứ 6',
                                    'Thứ 7',
                                  ][sessionDate.getDay()];
                                  const isToday = session.date === today;
                                  const daysUntil = getDaysUntil(session.date);
                                  const sessionStatus = session.realTimeStatus || session.status;

                                  // Count materials for this session
                                  const sessionMaterials = materials.find(
                                    m => m.session_id === session.session_id
                                  );
                                  const materialCount = sessionMaterials?.materials?.length || 0;

                                  return (
                                    <div
                                      key={session.session_id}
                                      onClick={() => handleSessionClick(session)}
                                      className={`bg-white rounded-lg p-5 border-l-4 transition-all hover:shadow-xl cursor-pointer transform hover:-translate-y-1 ${
                                        isToday
                                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg'
                                          : sessionStatus === 'ONGOING'
                                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg'
                                            : 'border-gray-300 hover:border-blue-400 shadow-sm'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h5 className="font-bold text-gray-800 text-lg">
                                              {dayName}
                                            </h5>
                                            {isToday && (
                                              <span className="px-2.5 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold shadow-sm">
                                                Hôm nay
                                              </span>
                                            )}
                                            {!isToday && daysUntil > 0 && (
                                              <span className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-full font-medium">
                                                Còn {daysUntil} ngày
                                              </span>
                                            )}
                                            {sessionStatus === 'ONGOING' && (
                                              <span className="px-2.5 py-1 bg-green-500 text-white text-xs rounded-full font-semibold animate-pulse shadow-sm">
                                                Đang diễn ra
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 mb-3 font-medium">
                                            {sessionDate.toLocaleDateString('vi-VN', {
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                            })}
                                          </p>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 text-base">📍</span>
                                              <span
                                                className={`font-medium ${!session.room ? 'text-gray-400 italic' : 'text-gray-700'}`}
                                              >
                                                {session.room || 'Chưa có phòng'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 text-base">🕐</span>
                                              <span className="font-semibold text-blue-600">
                                                {session.start_time}
                                                {session.end_time ? ` - ${session.end_time}` : ''}
                                              </span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                              <span className="text-gray-400 mt-0.5 text-base">
                                                📝
                                              </span>
                                              <span
                                                className={`font-medium line-clamp-2 ${!session.topic ? 'text-gray-400 italic' : 'text-gray-700'}`}
                                              >
                                                {session.topic || 'Chưa có chủ đề'}
                                              </span>
                                            </div>
                                            {materialCount > 0 && (
                                              <div className="flex items-center gap-2 pt-1">
                                                <span className="text-gray-400 text-base">📚</span>
                                                <span className="text-sm font-medium text-purple-600">
                                                  {materialCount} tài liệu
                                                </span>
                                              </div>
                                            )}
                                            {/* Attendance Status for upcoming sessions */}
                                            {session.hasAttended !== undefined && (
                                              <div className="mt-3 pt-3 border-t border-gray-200">
                                                {session.hasAttended ? (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-green-600 text-base">
                                                      ✅
                                                    </span>
                                                    <span className="text-sm font-medium text-green-600">
                                                      Đã điểm danh
                                                      {session.attendanceStatus && (
                                                        <span className="ml-1">
                                                          (
                                                          {session.attendanceStatus === 'PRESENT'
                                                            ? 'Đúng giờ'
                                                            : 'Muộn'}
                                                          )
                                                        </span>
                                                      )}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-base">
                                                      ⏳
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                      Chưa điểm danh
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {activeTab === 'finished' && (
              <div className="max-w-6xl mx-auto">
                {finishedSessions.length === 0 ? (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 text-center border-2 border-dashed border-green-200">
                    <div className="text-4xl mb-3">✅</div>
                    <p className="text-gray-700 font-medium text-lg mb-1">
                      Chưa có buổi học nào đã kết thúc
                    </p>
                    <p className="text-gray-500 text-sm">
                      Các buổi học đã hoàn thành sẽ hiển thị ở đây
                    </p>
                  </div>
                ) : (
                  (() => {
                    // Group sessions by month
                    const groupByMonth = sessions => {
                      const groups = {};
                      sessions.forEach(session => {
                        const sessionDate = new Date(session.date);
                        const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;

                        if (!groups[monthKey]) {
                          groups[monthKey] = [];
                        }
                        groups[monthKey].push(session);
                      });
                      return groups;
                    };

                    const monthGroups = groupByMonth(finishedSessions);
                    const monthKeys = Object.keys(monthGroups).sort().reverse(); // Newest first

                    // Helper to get month label
                    const getMonthLabel = monthKey => {
                      const [year, month] = monthKey.split('-');
                      const monthNames = [
                        'Tháng 1',
                        'Tháng 2',
                        'Tháng 3',
                        'Tháng 4',
                        'Tháng 5',
                        'Tháng 6',
                        'Tháng 7',
                        'Tháng 8',
                        'Tháng 9',
                        'Tháng 10',
                        'Tháng 11',
                        'Tháng 12',
                      ];
                      const today = new Date();
                      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

                      if (monthKey === currentMonth) {
                        return `Tháng này (${monthNames[parseInt(month) - 1]} ${year})`;
                      }
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    };

                    // Helper to calculate days ago
                    const getDaysAgo = dateStr => {
                      const sessionDate = new Date(dateStr);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      sessionDate.setHours(0, 0, 0, 0);
                      const diffTime = today - sessionDate;
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays;
                    };

                    return (
                      <div className="space-y-6">
                        {monthKeys.map(monthKey => {
                          const monthSessions = monthGroups[monthKey];

                          return (
                            <div
                              key={monthKey}
                              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
                            >
                              {/* Month Header */}
                              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-lg">
                                    {getMonthLabel(monthKey)}
                                  </h4>
                                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                    {monthSessions.length} buổi học
                                  </span>
                                </div>
                              </div>

                              {/* Sessions in this month - Grid Layout */}
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {monthSessions.map(session => {
                                  const sessionDate = new Date(session.date);
                                  const dayName = [
                                    'Chủ Nhật',
                                    'Thứ 2',
                                    'Thứ 3',
                                    'Thứ 4',
                                    'Thứ 5',
                                    'Thứ 6',
                                    'Thứ 7',
                                  ][sessionDate.getDay()];
                                  const daysAgo = getDaysAgo(session.date);

                                  // Count materials for this session
                                  const sessionMaterials = materials.find(
                                    m => m.session_id === session.session_id
                                  );
                                  const materialCount = sessionMaterials?.materials?.length || 0;

                                  return (
                                    <div
                                      key={session.session_id}
                                      onClick={() => handleSessionClick(session)}
                                      className="bg-white rounded-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 shadow-sm"
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h5 className="font-bold text-gray-800 text-lg">
                                              {dayName}
                                            </h5>
                                            {daysAgo === 0 && (
                                              <span className="px-2.5 py-1 bg-green-500 text-white text-xs rounded-full font-semibold shadow-sm">
                                                Hôm nay
                                              </span>
                                            )}
                                            {daysAgo === 1 && (
                                              <span className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-full font-medium">
                                                Hôm qua
                                              </span>
                                            )}
                                            {daysAgo > 1 && (
                                              <span className="px-2.5 py-1 bg-gray-200 text-gray-700 text-xs rounded-full font-medium">
                                                {daysAgo} ngày trước
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 mb-3 font-medium">
                                            {sessionDate.toLocaleDateString('vi-VN', {
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                            })}
                                          </p>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 text-base">📍</span>
                                              <span
                                                className={`font-medium ${!session.room ? 'text-gray-400 italic' : 'text-gray-700'}`}
                                              >
                                                {session.room || 'Chưa có phòng'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400 text-base">🕐</span>
                                              <span className="font-semibold text-gray-800">
                                                {session.start_time}
                                                {session.end_time ? ` - ${session.end_time}` : ''}
                                              </span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                              <span className="text-gray-400 mt-0.5 text-base">
                                                📝
                                              </span>
                                              <span
                                                className={`font-medium line-clamp-2 ${!session.topic ? 'text-gray-400 italic' : 'text-gray-700'}`}
                                              >
                                                {session.topic || 'Chưa có chủ đề'}
                                              </span>
                                            </div>
                                            {materialCount > 0 && (
                                              <div className="flex items-center gap-2 pt-1">
                                                <span className="text-gray-400 text-base">📚</span>
                                                <span className="text-sm font-medium text-purple-600">
                                                  {materialCount} tài liệu
                                                </span>
                                              </div>
                                            )}
                                            {/* Attendance Status for finished sessions */}
                                            {session.hasAttended !== undefined && (
                                              <div className="mt-3 pt-3 border-t border-gray-200">
                                                {session.hasAttended ? (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-green-600 text-base">
                                                      ✅
                                                    </span>
                                                    <span className="text-sm font-medium text-green-600">
                                                      Đã điểm danh
                                                      {session.attendanceStatus && (
                                                        <span className="ml-1">
                                                          (
                                                          {session.attendanceStatus === 'PRESENT'
                                                            ? 'Đúng giờ'
                                                            : session.attendanceStatus === 'LATE'
                                                              ? 'Muộn'
                                                              : 'Vắng'}
                                                          )
                                                        </span>
                                                      )}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-red-600 text-base">
                                                      ❌
                                                    </span>
                                                    <span className="text-sm font-medium text-red-600">
                                                      Vắng mặt
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </>
        );
      })()}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Tài Liệu Học Tập</h2>
          {materialsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Đang tải tài liệu...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Chưa có tài liệu học tập nào</p>
            </div>
          ) : (
            <div className="space-y-6">
              {materials.map(sessionGroup => (
                <div
                  key={sessionGroup.session_id}
                  className="border-b border-gray-200 pb-6 last:border-b-0"
                >
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {sessionGroup.session_topic || `Buổi ${sessionGroup.session_number || 'N/A'}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {sessionGroup.session_date
                        ? new Date(sessionGroup.session_date).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                      {sessionGroup.session_room && ` - Phòng: ${sessionGroup.session_room}`}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sessionGroup.materials.map(material => (
                      <div
                        key={material.material_id}
                        className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl flex-shrink-0">
                            {getFileIcon(material.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate" title={material.name}>
                              {material.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {material.file_type && (
                                <span className="uppercase">
                                  {material.file_type.split('/').pop()}
                                </span>
                              )}
                              {material.file_size && (
                                <>
                                  <span>•</span>
                                  <span>{formatFileSize(material.file_size)}</span>
                                </>
                              )}
                              {material.created_at && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {new Date(material.created_at).toLocaleDateString('vi-VN')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(material.file_url, '_blank')}
                          className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm flex-shrink-0"
                        >
                          Mở
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Modal for Student */}
      {showQRModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-600">QR Code Điểm Danh</h3>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedSession(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Session Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Thông tin buổi học:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>📅 Ngày: {new Date(selectedSession.date).toLocaleDateString('vi-VN')}</p>
                  <p>
                    🕐 Thời gian: {selectedSession.start_time}
                    {selectedSession.end_time ? ` - ${selectedSession.end_time}` : ''}
                  </p>
                  {selectedSession.room && <p>📍 Phòng: {selectedSession.room}</p>}
                  {selectedSession.topic && <p>📝 Chủ đề: {selectedSession.topic}</p>}
                </div>
              </div>

              {/* Two Options: Scan QR or Enter Code */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-700 mb-4 font-medium">Chọn phương thức điểm danh:</p>
                </div>

                {/* Option 1: Scan QR */}
                <button
                  onClick={() => {
                    if (
                      selectedSession.hasQR &&
                      !selectedSession.qrExpired &&
                      selectedSession.qrToken
                    ) {
                      // Navigate to scan page with token
                      navigate(`/student/scan?token=${selectedSession.qrToken}`);
                    } else {
                      // Navigate to scan page without token
                      navigate('/student/scan');
                    }
                  }}
                  className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-3"
                >
                  <FaCamera className="text-2xl" />
                  <span>Quét QR Code</span>
                </button>

                {/* Option 2: Enter Code */}
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    setShowManualInput(true);
                  }}
                  className="w-full px-6 py-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-3"
                >
                  <FaKeyboard className="text-2xl" />
                  <span>Nhập Mã Buổi Học</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {showManualInput && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-600">Điểm Danh</h3>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setSelectedSession(null);
                  setManualToken('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Thông tin buổi học:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>📅 Ngày: {new Date(selectedSession.date).toLocaleDateString('vi-VN')}</p>
                  <p>
                    🕐 Thời gian: {selectedSession.start_time}
                    {selectedSession.end_time ? ` - ${selectedSession.end_time}` : ''}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nhập mã QR từ giáo viên:
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={e => setManualToken(e.target.value)}
                  placeholder="Nhập mã QR..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setSelectedSession(null);
                    setManualToken('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleCheckIn(manualToken)}
                  disabled={!manualToken.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Điểm Danh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Info Modal for Finished Sessions */}
      {showAttendanceInfoModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-600">Thông Tin Điểm Danh</h3>
              <button
                onClick={() => {
                  setShowAttendanceInfoModal(false);
                  setSelectedSession(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Session Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Thông tin buổi học:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>📅 Ngày: {new Date(selectedSession.date).toLocaleDateString('vi-VN')}</p>
                  <p>
                    🕐 Thời gian: {selectedSession.start_time}
                    {selectedSession.end_time ? ` - ${selectedSession.end_time}` : ''}
                  </p>
                  {selectedSession.room && <p>📍 Phòng: {selectedSession.room}</p>}
                  {selectedSession.topic && <p>📝 Chủ đề: {selectedSession.topic}</p>}
                </div>
              </div>

              {/* Attendance Status */}
              {selectedSession.hasAttended && selectedSession.attendanceRecord ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-3">✅ Đã Điểm Danh</h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-700">Trạng thái:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            selectedSession.attendanceStatus === 'PRESENT'
                              ? 'bg-green-100 text-green-700'
                              : selectedSession.attendanceStatus === 'LATE'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {selectedSession.attendanceStatus === 'PRESENT'
                            ? '✅ Đúng giờ'
                            : selectedSession.attendanceStatus === 'LATE'
                              ? '⏰ Đi muộn'
                              : '❌ Vắng'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-700">Thời gian điểm danh:</span>
                        <span className="text-green-600">
                          {selectedSession.attendanceTime
                            ? new Date(selectedSession.attendanceTime).toLocaleString('vi-VN')
                            : 'N/A'}
                        </span>
                      </div>

                      {/* Validation Status */}
                      {(() => {
                        const isValid = selectedSession.attendanceRecord.is_valid;
                        // Convert to number for comparison (handle boolean, string, or number)
                        const isValidNum =
                          isValid === null || isValid === undefined ? null : Number(isValid);

                        if (isValidNum === null) {
                          return (
                            <div className="flex items-center justify-between pt-2 border-t border-green-200">
                              <span className="font-medium text-green-700">Đánh giá:</span>
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                                ⏳ Chờ giáo viên đánh giá
                              </span>
                            </div>
                          );
                        } else if (isValidNum === 1) {
                          return (
                            <div className="flex items-center justify-between pt-2 border-t border-green-200">
                              <span className="font-medium text-green-700">Đánh giá:</span>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                ✅ Hợp lệ
                              </span>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center justify-between pt-2 border-t border-green-200">
                              <span className="font-medium text-green-700">Đánh giá:</span>
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                ❌ Không hợp lệ
                              </span>
                            </div>
                          );
                        }
                      })()}

                      {/* GPS Location or Reason */}
                      {selectedSession.attendanceRecord.latitude &&
                      selectedSession.attendanceRecord.longitude ? (
                        <div className="pt-2 border-t border-green-200">
                          <p className="font-medium text-green-700 mb-1">📍 Vị trí điểm danh:</p>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://www.google.com/maps?q=${selectedSession.attendanceRecord.latitude},${selectedSession.attendanceRecord.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              🗺️ Xem trên Google Maps
                            </a>
                          </div>
                        </div>
                      ) : selectedSession.attendanceRecord.no_gps_reason ? (
                        <div className="pt-2 border-t border-green-200">
                          <p className="font-medium text-green-700 mb-1">⚠️ Lý do không có GPS:</p>
                          <p className="text-sm text-green-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                            {selectedSession.attendanceRecord.no_gps_reason}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">❌ Chưa Điểm Danh</h4>
                  <p className="text-sm text-red-700">
                    Bạn chưa điểm danh cho buổi học này. Buổi học đã kết thúc nên không thể điểm
                    danh nữa.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowAttendanceInfoModal(false);
                    setSelectedSession(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {showSessionDetailModal && selectedSessionDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-600">Chi Tiết Buổi Học</h3>
              <button
                onClick={() => {
                  setShowSessionDetailModal(false);
                  setSelectedSessionDetail(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Session Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Thông tin buổi học</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">📅 Ngày:</span>
                    <p className="font-medium text-gray-800">
                      {new Date(selectedSessionDetail.date).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">🕐 Thời gian:</span>
                    <p className="font-medium text-gray-800">
                      {selectedSessionDetail.start_time}
                      {selectedSessionDetail.end_time ? ` - ${selectedSessionDetail.end_time}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">📍 Phòng:</span>
                    <p
                      className={`font-medium ${!selectedSessionDetail.room ? 'text-gray-400 italic' : 'text-gray-800'}`}
                    >
                      {selectedSessionDetail.room || 'Chưa có phòng'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">📝 Chủ đề:</span>
                    <p
                      className={`font-medium ${!selectedSessionDetail.topic ? 'text-gray-400 italic' : 'text-gray-800'}`}
                    >
                      {selectedSessionDetail.topic || 'Chưa có chủ đề'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Status */}
              {(() => {
                const now = new Date();
                const sessionDate = new Date(selectedSessionDetail.date);
                const [startHour, startMinute] = (selectedSessionDetail.start_time || '00:00')
                  .split(':')
                  .map(Number);
                const sessionStartTime = new Date(sessionDate);
                sessionStartTime.setHours(startHour, startMinute, 0, 0);

                let sessionEndTime = null;
                if (selectedSessionDetail.end_time) {
                  const [endHour, endMinute] = selectedSessionDetail.end_time
                    .split(':')
                    .map(Number);
                  sessionEndTime = new Date(sessionDate);
                  sessionEndTime.setHours(endHour, endMinute, 0, 0);
                } else {
                  sessionEndTime = new Date(sessionStartTime);
                  sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
                }

                let realTimeStatus = selectedSessionDetail.status;
                if (selectedSessionDetail.status !== 'CANCELLED') {
                  if (now < sessionStartTime) {
                    realTimeStatus = 'UPCOMING';
                  } else if (now >= sessionStartTime && (!sessionEndTime || now < sessionEndTime)) {
                    realTimeStatus = 'ONGOING';
                  } else if (sessionEndTime && now >= sessionEndTime) {
                    realTimeStatus = 'FINISHED';
                  }
                }

                return (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-2">Trạng thái</h4>
                    <div className="flex items-center gap-2">
                      {realTimeStatus === 'ONGOING' && (
                        <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full font-semibold animate-pulse">
                          🟢 Đang diễn ra
                        </span>
                      )}
                      {realTimeStatus === 'UPCOMING' && (
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full font-semibold">
                          📅 Sắp tới
                        </span>
                      )}
                      {realTimeStatus === 'FINISHED' && (
                        <span className="px-3 py-1 bg-gray-500 text-white text-sm rounded-full font-semibold">
                          ✅ Đã kết thúc
                        </span>
                      )}
                      {selectedSessionDetail.status === 'CANCELLED' && (
                        <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full font-semibold">
                          ❌ Đã hủy
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Materials */}
              {(() => {
                const sessionMaterials = materials.find(
                  m => m.session_id === selectedSessionDetail.session_id
                );
                const materialList = sessionMaterials?.materials || [];

                if (materialList.length > 0) {
                  return (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-3">
                        📚 Tài liệu học tập ({materialList.length})
                      </h4>
                      <div className="space-y-2">
                        {materialList.map((material, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3 rounded border border-purple-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-2xl">{getFileIcon(material.file_type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">
                                  {material.name}
                                </p>
                                {material.file_size && (
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(material.file_size)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => window.open(material.file_url, '_blank')}
                              className="ml-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm flex-shrink-0"
                            >
                              Mở
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Action Buttons */}
              {(() => {
                const now = new Date();
                const sessionDate = new Date(selectedSessionDetail.date);
                const [startHour, startMinute] = (selectedSessionDetail.start_time || '00:00')
                  .split(':')
                  .map(Number);
                const sessionStartTime = new Date(sessionDate);
                sessionStartTime.setHours(startHour, startMinute, 0, 0);

                let sessionEndTime = null;
                if (selectedSessionDetail.end_time) {
                  const [endHour, endMinute] = selectedSessionDetail.end_time
                    .split(':')
                    .map(Number);
                  sessionEndTime = new Date(sessionDate);
                  sessionEndTime.setHours(endHour, endMinute, 0, 0);
                } else {
                  sessionEndTime = new Date(sessionStartTime);
                  sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
                }

                let realTimeStatus = selectedSessionDetail.status;
                if (selectedSessionDetail.status !== 'CANCELLED') {
                  if (now < sessionStartTime) {
                    realTimeStatus = 'UPCOMING';
                  } else if (now >= sessionStartTime && (!sessionEndTime || now < sessionEndTime)) {
                    realTimeStatus = 'ONGOING';
                  } else if (sessionEndTime && now >= sessionEndTime) {
                    realTimeStatus = 'FINISHED';
                  }
                }

                if (realTimeStatus === 'ONGOING') {
                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowSessionDetailModal(false);
                          handleSessionClick(selectedSessionDetail);
                        }}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <FaCamera className="text-xl" />
                        Điểm Danh
                      </button>
                    </div>
                  );
                } else if (realTimeStatus === 'FINISHED') {
                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowSessionDetailModal(false);
                          handleSessionClick(selectedSessionDetail);
                        }}
                        className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <FaCheckCircle className="text-xl" />
                        Xem Thông Tin Điểm Danh
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSessionDetailModal(false);
                    setSelectedSessionDetail(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Result Modal */}
      {showCheckInResultModal && checkInResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-600">Kết Quả Điểm Danh</h3>
              <button
                onClick={() => {
                  setShowCheckInResultModal(false);
                  setCheckInResult(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {checkInResult.success ? (
                <>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                    <FaCheckCircle className="text-5xl text-green-600 mx-auto mb-3" />
                    <h4 className="text-xl font-semibold text-green-800 mb-2">
                      {checkInResult.message}
                    </h4>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Thông tin điểm danh:</h4>
                    <div className="space-y-2 text-sm">
                      {checkInResult.classInfo && (
                        <>
                          <p className="text-gray-700">
                            <span className="font-medium">Môn học/Lớp:</span>{' '}
                            {checkInResult.classInfo.name || 'N/A'}
                          </p>
                          <p className="text-gray-700">
                            <span className="font-medium">Mã lớp:</span>{' '}
                            {checkInResult.classInfo.class_code || 'N/A'}
                          </p>
                        </>
                      )}
                      <p className="text-gray-700">
                        <span className="font-medium">Trạng thái:</span>{' '}
                        <span
                          className={`font-semibold ${
                            checkInResult.status === 'PRESENT'
                              ? 'text-green-600'
                              : checkInResult.status === 'LATE'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {checkInResult.status === 'PRESENT'
                            ? '✅ Đúng giờ'
                            : checkInResult.status === 'LATE'
                              ? '⏰ Đi muộn'
                              : '❌ Vắng'}
                        </span>
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Thời gian điểm danh:</span>{' '}
                        {checkInResult.checkinTime}
                      </p>

                      {/* Validation Status */}
                      {(() => {
                        const isValid = checkInResult.is_valid;
                        // Convert to number for comparison (handle boolean, string, or number)
                        const isValidNum =
                          isValid === null || isValid === undefined ? null : Number(isValid);

                        if (isValidNum === null) {
                          return (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-gray-700 mb-2">
                                <span className="font-medium">Đánh giá:</span>{' '}
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                  ⏳ Chờ giáo viên đánh giá
                                </span>
                              </p>
                              {checkInResult.no_gps_reason && (
                                <div className="mt-2 bg-yellow-50 p-3 rounded border border-yellow-200">
                                  <p className="text-sm text-yellow-800">
                                    <span className="font-semibold">Lý do không có GPS:</span>{' '}
                                    {checkInResult.no_gps_reason}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        } else if (isValidNum === 1) {
                          return (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-gray-700 mb-2">
                                <span className="font-medium">Đánh giá:</span>{' '}
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                  ✅ Hợp lệ
                                </span>
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-gray-700 mb-2">
                                <span className="font-medium">Đánh giá:</span>{' '}
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  ❌ Không hợp lệ (Ngoài phạm vi cho phép)
                                </span>
                              </p>
                            </div>
                          );
                        }
                      })()}

                      {/* GPS Location */}
                      {checkInResult.latitude && checkInResult.longitude && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-gray-700 mb-1">
                            <span className="font-medium">📍 Vị trí điểm danh:</span>
                          </p>
                          <a
                            href={`https://www.google.com/maps?q=${checkInResult.latitude},${checkInResult.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            🗺️ Xem trên Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                  <FaTimesCircle className="text-5xl text-red-600 mx-auto mb-3" />
                  <h4 className="text-xl font-semibold text-red-800">{checkInResult.message}</h4>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowCheckInResultModal(false);
                    setCheckInResult(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
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

export default StudentClassDetail;
