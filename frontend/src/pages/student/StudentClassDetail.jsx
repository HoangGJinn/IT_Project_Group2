import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaUser, FaCalendar, FaClock, FaMapMarkerAlt, FaChartLine, FaQrcode, FaCheckCircle } from 'react-icons/fa';
import api from '../../utils/api';
import { formatScheduleDays, formatSchedulePeriods } from '../../utils/schedule';
import { QRCodeSVG } from 'qrcode.react';

function StudentClassDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('info');
  const [classInfo, setClassInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // QR Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

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
          description: data.course?.description || 'Chưa có mô tả',
        });
        setSessions(data.sessions || []);
        // Materials would come from a separate endpoint if available
        setMaterials([]);
      }
    } catch (error) {
      console.error('Fetch class detail error:', error);
      setError(error.response?.data?.message || 'Không thể tải thông tin lớp học');
    } finally {
      setLoading(false);
    }
  };

  // Handle session click - show QR or attendance options
  const handleSessionClick = (session) => {
    setSelectedSession(session);
    // If session has QR and not expired, show QR modal
    if (session.hasQR && !session.qrExpired) {
      setShowQRModal(true);
    } else {
      // Otherwise, show manual input for token
      setShowManualInput(true);
    }
  };

  // Handle attendance check-in
  const handleCheckIn = async (token) => {
    try {
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
          return;
        }
      }
      
      const response = await api.post('/student/attendance/scan', {
        token: token,
        ...(latitude && longitude ? { latitude, longitude } : {})
      });

      if (response.data.success) {
        alert('✅ Điểm danh thành công!');
        setShowQRModal(false);
        setShowManualInput(false);
        setSelectedSession(null);
        setManualToken('');
        fetchClassDetail(); // Refresh to show updated attendance status
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert(error.response?.data?.message || 'Điểm danh thất bại');
    }
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
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Thông Tin Khác</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Mô tả môn học</p>
                  <p className="text-gray-800">{classInfo.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helper function to calculate session status */}
      {(() => {
        const now = new Date();
        const calculateSessionStatus = (session) => {
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
            sessionEndTime
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
        
        const getStatusText = (session) => {
          const status = session.realTimeStatus || session.status;
          if (status === 'FINISHED') return 'Đã kết thúc';
          if (status === 'ONGOING') return 'Đang diễn ra';
          if (status === 'UPCOMING' || status === 'SCHEDULED') return 'Sắp tới';
          if (status === 'CANCELLED') return 'Đã hủy';
          return status;
        };
        
        const getStatusColor = (session) => {
          const status = session.realTimeStatus || session.status;
          if (status === 'FINISHED') return 'border-green-500';
          if (status === 'ONGOING') return 'border-blue-500';
          if (status === 'UPCOMING' || status === 'SCHEDULED') return 'border-yellow-500';
          if (status === 'CANCELLED') return 'border-red-500';
          return 'border-gray-500';
        };
        
        return (
          <>
            {activeTab === 'upcoming' && (
              <div className="max-w-6xl mx-auto">
                {upcomingSessions.length === 0 ? (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center border-2 border-dashed border-blue-200">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-700 font-medium text-lg mb-1">Chưa có buổi học sắp tới</p>
                    <p className="text-gray-500 text-sm">Các buổi học sắp tới sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  (() => {
                    const today = new Date().toISOString().split('T')[0];
                    
                    // Group sessions by week
                    const groupByWeek = (sessions) => {
                      const groups = {};
                      sessions.forEach(session => {
                        const sessionDate = new Date(session.date);
                        const weekStart = new Date(sessionDate);
                        weekStart.setDate(sessionDate.getDate() - sessionDate.getDay() + (sessionDate.getDay() === 0 ? -6 : 1));
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
                    const getWeekLabel = (weekStart) => {
                      const start = new Date(weekStart);
                      const end = new Date(start);
                      end.setDate(end.getDate() + 6);
                      const todayDate = new Date();
                      todayDate.setHours(0, 0, 0, 0);
                      
                      if (start <= todayDate && todayDate <= end) {
                        return 'Tuần này';
                      }
                      const nextWeek = new Date(todayDate);
                      nextWeek.setDate(todayDate.getDate() + 7 - todayDate.getDay() + (todayDate.getDay() === 0 ? -6 : 1));
                      if (start.getTime() === nextWeek.getTime()) {
                        return 'Tuần sau';
                      }
                      return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
                    };
                    
                    // Helper to calculate days until session
                    const getDaysUntil = (dateStr) => {
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
                        {weekKeys.map((weekKey) => {
                          const weekSessions = weekGroups[weekKey];
                          const weekStart = new Date(weekKey);
                          
                          return (
                            <div key={weekKey} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
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
                                {weekSessions.map((session) => {
                                  const sessionDate = new Date(session.date);
                                  const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][sessionDate.getDay()];
                                  const isToday = session.date === today;
                                  const daysUntil = getDaysUntil(session.date);
                                  const sessionStatus = session.realTimeStatus || session.status;
                                  
                                  return (
                                    <div 
                                      key={session.session_id} 
                                      onClick={() => handleSessionClick(session)}
                                      className={`bg-gradient-to-r rounded-lg p-4 border-l-4 transition-all hover:shadow-lg cursor-pointer ${
                                        isToday 
                                          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md' 
                                          : sessionStatus === 'ONGOING'
                                          ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50'
                                          : 'border-gray-300 bg-white hover:border-blue-400'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h5 className="font-bold text-gray-800 text-base">
                                              {dayName}
                                            </h5>
                                            {isToday && (
                                              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold">
                                                Hôm nay
                                              </span>
                                            )}
                                            {!isToday && daysUntil > 0 && (
                                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                                Còn {daysUntil} ngày
                                              </span>
                                            )}
                                            {sessionStatus === 'ONGOING' && (
                                              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold animate-pulse">
                                                Đang diễn ra
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 mb-2 font-medium">
                                            {sessionDate.toLocaleDateString('vi-VN', { 
                                              day: 'numeric', 
                                              month: 'long', 
                                              year: 'numeric' 
                                            })}
                                          </p>
                                          <div className="space-y-1.5 text-sm text-gray-700">
                                            {session.room && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-400">📍</span>
                                                <span className="font-medium">{session.room}</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400">🕐</span>
                                              <span className="font-semibold text-blue-600">
                                                {session.start_time}
                                                {session.end_time ? ` - ${session.end_time}` : ''}
                                              </span>
                                            </div>
                                            {session.topic && (
                                              <div className="flex items-start gap-2">
                                                <span className="text-gray-400 mt-0.5">📝</span>
                                                <span className="font-medium line-clamp-2">{session.topic}</span>
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
                    <p className="text-gray-700 font-medium text-lg mb-1">Chưa có buổi học nào đã kết thúc</p>
                    <p className="text-gray-500 text-sm">Các buổi học đã hoàn thành sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  (() => {
                    // Group sessions by month
                    const groupByMonth = (sessions) => {
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
                    const getMonthLabel = (monthKey) => {
                      const [year, month] = monthKey.split('-');
                      const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                                        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
                      const today = new Date();
                      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
                      
                      if (monthKey === currentMonth) {
                        return `Tháng này (${monthNames[parseInt(month) - 1]} ${year})`;
                      }
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    };
                    
                    // Helper to calculate days ago
                    const getDaysAgo = (dateStr) => {
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
                        {monthKeys.map((monthKey) => {
                          const monthSessions = monthGroups[monthKey];
                          
                          return (
                            <div key={monthKey} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                              {/* Month Header */}
                              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-lg">{getMonthLabel(monthKey)}</h4>
                                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                                    {monthSessions.length} buổi học
                                  </span>
                                </div>
                              </div>
                              
                              {/* Sessions in this month - Grid Layout */}
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {monthSessions.map((session) => {
                                  const sessionDate = new Date(session.date);
                                  const dayName = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][sessionDate.getDay()];
                                  const daysAgo = getDaysAgo(session.date);
                                  
                                  return (
                                    <div 
                                      key={session.session_id} 
                                      onClick={() => handleSessionClick(session)}
                                      className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border-l-4 border-green-500 hover:shadow-md transition-all cursor-pointer"
                                    >
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h5 className="font-bold text-gray-800 text-base">
                                              {dayName}
                                            </h5>
                                            {daysAgo === 0 && (
                                              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-semibold">
                                                Hôm nay
                                              </span>
                                            )}
                                            {daysAgo === 1 && (
                                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                                Hôm qua
                                              </span>
                                            )}
                                            {daysAgo > 1 && (
                                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                                                {daysAgo} ngày trước
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-sm text-gray-600 mb-2 font-medium">
                                            {sessionDate.toLocaleDateString('vi-VN', { 
                                              day: 'numeric', 
                                              month: 'long', 
                                              year: 'numeric' 
                                            })}
                                          </p>
                                          <div className="space-y-1.5 text-sm text-gray-700">
                                            {session.room && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-gray-400">📍</span>
                                                <span className="font-medium">{session.room}</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-400">🕐</span>
                                              <span className="font-semibold text-green-600">
                                                {session.start_time}
                                                {session.end_time ? ` - ${session.end_time}` : ''}
                                              </span>
                                            </div>
                                            {session.topic && (
                                              <div className="flex items-start gap-2">
                                                <span className="text-gray-400 mt-0.5">📝</span>
                                                <span className="font-medium line-clamp-2">{session.topic}</span>
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
          <div className="space-y-3">
            {materials.map(material => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {material.type === 'pdf' ? 'PDF' : material.type === 'docx' ? 'DOC' : 'VID'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{material.name}</p>
                    <p className="text-sm text-gray-500">{material.size}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                  Tải Xuống
                </button>
              </div>
            ))}
          </div>
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
                  <p>🕐 Thời gian: {selectedSession.start_time}{selectedSession.end_time ? ` - ${selectedSession.end_time}` : ''}</p>
                  {selectedSession.room && <p>📍 Phòng: {selectedSession.room}</p>}
                  {selectedSession.topic && <p>📝 Chủ đề: {selectedSession.topic}</p>}
                </div>
              </div>

              {/* QR Code Display */}
              {selectedSession.hasQR && !selectedSession.qrExpired && selectedSession.qrToken && (
                <>
                  <div className="flex justify-center bg-white p-6 rounded-lg border-2 border-gray-200">
                    <QRCodeSVG
                      value={`${window.location.origin}/student/scan?token=${selectedSession.qrToken}`}
                      size={256}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      📱 Quét QR code này bằng camera điện thoại để điểm danh
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleCheckIn(selectedSession.qrToken)}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    ✅ Điểm Danh Ngay
                  </button>
                </>
              )}

              {/* Manual Token Input */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-2">Hoặc nhập mã QR thủ công:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Nhập mã QR..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleCheckIn(manualToken)}
                    disabled={!manualToken.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Điểm Danh
                  </button>
                </div>
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
                  <p>🕐 Thời gian: {selectedSession.start_time}{selectedSession.end_time ? ` - ${selectedSession.end_time}` : ''}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nhập mã QR từ giáo viên:
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
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
    </div>
  );
}

export default StudentClassDetail;
