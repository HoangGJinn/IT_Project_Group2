import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import LocationPicker from '../components/LocationPicker';
import { QRCodeSVG } from 'qrcode.react';

function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [classInfo, setClassInfo] = useState(null);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState(null);
  const [showQRDurationModal, setShowQRDurationModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingQRParams, setPendingQRParams] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentCode, setStudentCode] = useState('');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState(null);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [showDeleteSessionConfirm, setShowDeleteSessionConfirm] = useState(false);
  const [materialName, setMaterialName] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [showAttendanceListModal, setShowAttendanceListModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [allAttendanceLoading, setAllAttendanceLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');

  // Class Report
  const [classReport, setClassReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Students list improvements
  const [studentSearch, setStudentSearch] = useState('');
  const [sortField, setSortField] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');

  // History tab improvements
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [newSession, setNewSession] = useState({
    date: '',
    start_time: '',
    end_time: '',
    room: '',
    topic: '',
  });

  // Settings tab improvements
  const [settings, setSettings] = useState({
    name: '',
    class_code: '',
    capacity: '',
    planned_sessions: '',
    schedule_days: '',
    schedule_periods: '',
    start_date: '',
    end_date: '',
    image_url: '',
    default_duration_min: '',
    default_late_after_min: '',
    default_method: 'QR',
  });

  // QR Code Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState({
    token: '',
    url: '',
    expiresAt: null,
    locationRadius: 15,
    teacherLatitude: null,
    teacherLongitude: null,
    sessionInfo: null,
  });

  // Force re-render every minute to update session status in real-time
  const [, setRefreshKey] = useState(0);

  // Format file size
  const formatFileSize = bytes => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchClassDetail();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
      fetchSessions(); // Also fetch sessions to show next upcoming/ongoing session
    } else if (activeTab === 'upcoming' || activeTab === 'finished') {
      fetchSessions();
    } else if (activeTab === 'report') {
      fetchClassReport();
    } else if (activeTab === 'attendance') {
      fetchAllAttendanceRecords();
    } else if (activeTab === 'settings' && classInfo) {
      // Load settings when tab is opened
      setSettings({
        name: classInfo.name || '',
        class_code: classInfo.class_code || '',
        capacity: classInfo.capacity || '',
        planned_sessions: classInfo.planned_sessions || '',
        schedule_days: classInfo.schedule_days || '',
        schedule_periods: classInfo.schedule_periods || '',
        start_date: classInfo.start_date || '',
        end_date: classInfo.end_date || '',
        image_url: classInfo.image_url || '',
        default_duration_min: classInfo.default_duration_min || '90',
        default_late_after_min: classInfo.default_late_after_min || '15',
        default_method: classInfo.default_method || 'QR',
      });
    }
  }, [id, activeTab, classInfo]);

  // Reload sessions when tab changes
  useEffect(() => {
    if (activeTab === 'upcoming' || activeTab === 'finished') {
      fetchSessions();
    }
  }, [activeTab]);

  const fetchClassDetail = async () => {
    try {
      const response = await api.get(`/classes/${id}`);
      if (response.data.success) {
        setClassInfo(response.data.data);
      }
    } catch (error) {
      console.error('Fetch class detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/classes/${id}/students`);
      if (response.data.success) {
        setStudents(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch students error:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get(`/sessions/classes/${id}`);
      if (response.data.success) {
        setSessions(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch sessions error:', error);
    }
  };

  const handleCreateQR = async (lateAfterMinutes, locationRadius) => {
    if (!selectedSessionForQR) {
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
          location_radius: parseInt(pendingQRParams.locationRadius) || 15,
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
          locationRadius: pendingQRParams.locationRadius || 15,
          teacherLatitude: response.data.data.teacher_latitude || location.latitude,
          teacherLongitude: response.data.data.teacher_longitude || location.longitude,
          sessionInfo: {
            date: selectedSessionForQR.date,
            time: `${selectedSessionForQR.start_time}${selectedSessionForQR.end_time ? ` - ${selectedSessionForQR.end_time}` : ''}`,
            room: selectedSessionForQR.room || 'Chưa có',
            topic: selectedSessionForQR.topic || 'Chưa có',
          },
        });
        setShowQRModal(true);
        setShowQRDurationModal(false);
        setSelectedSessionForQR(null);
        setPendingQRParams(null);
        fetchSessions(); // Refresh sessions to show updated QR status
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

  const handleOpenQRModal = session => {
    setSelectedSessionForQR(session);
    setShowQRDurationModal(true);
  };

  const handleStartSession = async session => {
    try {
      const response = await api.post(`/sessions/${session.session_id}/start`);
      if (response.data.success) {
        alert('Buổi học đã được bắt đầu');
        fetchSessions(); // Refresh sessions
      }
    } catch (error) {
      console.error('Start session error:', error);
      alert(error.response?.data?.message || 'Bắt đầu buổi học thất bại');
    }
  };

  const handleViewSessionDetail = session => {
    setSelectedSessionDetail(session);
    setShowSessionDetailModal(true);
  };

  const fetchAttendanceRecords = async attendanceSessionId => {
    try {
      setAttendanceLoading(true);
      const response = await api.get(`/attendance/sessions/${attendanceSessionId}`);
      if (response.data.success) {
        setAttendanceRecords(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch attendance records error:', error);
      alert(error.response?.data?.message || 'Không thể tải danh sách điểm danh');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchAllAttendanceRecords = async () => {
    try {
      setAllAttendanceLoading(true);
      const response = await api.get(`/classes/${id}/attendance`);
      if (response.data.success) {
        setAttendanceData(response.data.data);
        setAllAttendanceRecords(response.data.data.records || []);
        // Reset filters when fetching new data
        setSelectedSessionFilter('all');
        setSelectedDateFilter('all');
      }
    } catch (error) {
      console.error('Fetch all attendance records error:', error);
      alert(error.response?.data?.message || 'Không thể tải danh sách điểm danh');
    } finally {
      setAllAttendanceLoading(false);
    }
  };

  const handleEditSession = session => {
    setSelectedSessionDetail(session);
    setShowEditSessionModal(true);
  };

  const handleUpdateSession = async () => {
    if (!selectedSessionDetail) return;

    try {
      // Format date to YYYY-MM-DD if it's not already in that format
      let formattedDate = selectedSessionDetail.date;
      if (formattedDate && formattedDate.includes('/')) {
        // Convert from DD/MM/YYYY or MM/DD/YYYY to YYYY-MM-DD
        const dateParts = formattedDate.split('/');
        if (dateParts.length === 3) {
          formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }
      } else if (formattedDate instanceof Date) {
        formattedDate = formattedDate.toISOString().split('T')[0];
      }

      const response = await api.put(`/sessions/${selectedSessionDetail.session_id}`, {
        date: formattedDate,
        start_time: selectedSessionDetail.start_time,
        end_time: selectedSessionDetail.end_time || null,
        room: selectedSessionDetail.room || null,
        topic: selectedSessionDetail.topic || null,
      });

      if (response.data.success) {
        alert('Cập nhật buổi học thành công');
        setShowEditSessionModal(false);
        setSelectedSessionDetail(null);
        fetchSessions();
      }
    } catch (error) {
      console.error('Update session error:', error);
      alert(error.response?.data?.message || 'Cập nhật buổi học thất bại');
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSessionDetail) return;

    try {
      const response = await api.delete(`/sessions/${selectedSessionDetail.session_id}`);
      if (response.data.success) {
        alert('Xóa buổi học thành công');
        setShowDeleteSessionConfirm(false);
        setShowSessionDetailModal(false);
        setSelectedSessionDetail(null);
        fetchSessions();
      }
    } catch (error) {
      console.error('Delete session error:', error);
      alert(error.response?.data?.message || 'Xóa buổi học thất bại');
    }
  };

  const fetchClassReport = async () => {
    if (!id) return;

    try {
      setReportLoading(true);
      const response = await api.get(`/reports/classes/${id}`);
      if (response.data.success) {
        setClassReport(response.data.data);
      } else {
        setClassReport(null);
      }
    } catch (error) {
      console.error('Fetch class report error:', error);
      setClassReport(null);
      // Don't show alert for 404 or empty data - it's normal
      if (error.response?.status !== 404) {
        console.error('Error details:', error.response?.data || error.message);
      }
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportClassReport = () => {
    if (!classReport || !classReport.students || classReport.students.length === 0) {
      alert('Không có dữ liệu để xuất file');
      return;
    }

    const csvContent = [
      [
        'STT',
        'Họ và tên',
        'MSVV',
        'Tổng số buổi',
        'Đúng giờ',
        'Muộn',
        'Vắng',
        'Tỉ lệ chuyên cần',
        'Hợp lệ',
        'Tỉ lệ hợp lệ',
        'Không hợp lệ',
        'Tỉ lệ không hợp lệ',
        'Chờ đánh giá',
      ],
      ...classReport.students.map((student, index) => [
        index + 1,
        student.full_name,
        student.student_code,
        student.total_sessions,
        student.on_time || 0,
        student.late || 0,
        student.absent || 0,
        student.attendance_rate,
        student.valid_count || 0,
        student.valid_rate || '0%',
        student.invalid_count || 0,
        student.invalid_rate || '0%',
        student.pending_count || 0,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `BaoCao_${classReport.class.class_code}_${classReport.class.school_year}_${classReport.class.semester}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Xuất file thành công!');
  };

  const handleAddStudent = async () => {
    if (!studentCode.trim()) {
      alert('Vui lòng nhập mã sinh viên');
      return;
    }

    try {
      // First, find student by student_code
      const searchResponse = await api.get(`/classes/students/search?code=${studentCode.trim()}`);
      if (!searchResponse.data.success || !searchResponse.data.data) {
        alert('Không tìm thấy sinh viên với mã này');
        return;
      }

      const student = searchResponse.data.data;
      const response = await api.post(`/classes/${id}/students`, {
        student_id: student.student_id,
      });

      if (response.data.success) {
        alert('Thêm sinh viên thành công!');
        setShowAddStudentModal(false);
        setStudentCode('');
        fetchStudents();
      }
    } catch (error) {
      console.error('Add student error:', error);
      alert(error.response?.data?.message || 'Thêm sinh viên thất bại');
    }
  };

  const handleDeleteStudents = async () => {
    if (selectedStudents.length === 0) {
      alert('Vui lòng chọn sinh viên cần xóa');
      return;
    }

    if (!window.confirm(`Bạn có chắc muốn xóa ${selectedStudents.length} sinh viên?`)) {
      return;
    }

    try {
      const deletePromises = selectedStudents.map(studentId =>
        api.delete(`/classes/${id}/students/${studentId}`)
      );

      await Promise.all(deletePromises);
      alert('Xóa sinh viên thành công!');
      setSelectedStudents([]);
      fetchStudents();
    } catch (error) {
      console.error('Delete students error:', error);
      alert(error.response?.data?.message || 'Xóa sinh viên thất bại');
    }
  };

  const handleToggleStudentSelection = studentId => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleUploadMaterial = async () => {
    if (!materialName.trim() || !materialUrl.trim()) {
      alert('Vui lòng nhập tên tài liệu và URL');
      return;
    }

    try {
      const response = await api.post(`/materials/sessions/${selectedSessionId}`, {
        name: materialName.trim(),
        file_url: materialUrl.trim(),
      });

      if (response.data.success) {
        alert('Thêm tài liệu thành công!');
        setShowMaterialModal(false);
        setMaterialName('');
        setMaterialUrl('');
        const sessionId = selectedSessionId;
        setSelectedSessionId(null);

        // Refresh sessions to get updated materials
        await fetchSessions();

        // If session detail modal was open, refresh it
        if (showSessionDetailModal && sessionId) {
          // Wait a bit for sessions to update
          setTimeout(() => {
            const updatedSession = sessions.find(s => s.session_id === sessionId);
            if (updatedSession) {
              setSelectedSessionDetail(updatedSession);
            } else {
              // If not found, fetch again
              fetchSessions().then(() => {
                const updatedSession = sessions.find(s => s.session_id === sessionId);
                if (updatedSession) {
                  setSelectedSessionDetail(updatedSession);
                }
              });
            }
          }, 500);
        }
      }
    } catch (error) {
      console.error('Upload material error:', error);
      alert(error.response?.data?.message || 'Thêm tài liệu thất bại');
    }
  };

  // Handle create session
  const handleCreateSession = async () => {
    if (!newSession.date || !newSession.start_time) {
      alert('Vui lòng điền đầy đủ ngày và giờ bắt đầu');
      return;
    }

    try {
      const response = await api.post(`/sessions/classes/${id}`, newSession);
      if (response.data.success) {
        alert('Tạo buổi học thành công!');
        setShowCreateSessionModal(false);
        setNewSession({ date: '', start_time: '', end_time: '', room: '', topic: '' });
        fetchSessions();
      }
    } catch (error) {
      console.error('Create session error:', error);
      alert(error.response?.data?.message || 'Tạo buổi học thất bại');
    }
  };

  // Handle delete class
  const handleDeleteClass = async () => {
    if (!classInfo) return;

    const confirmMessage = `Bạn có chắc chắn muốn xóa lớp học "${classInfo.class_code}"?\n\nHành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị xóa:\n- Tất cả buổi học\n- Tất cả bản ghi điểm danh\n- Tất cả sinh viên đã đăng ký\n- Tất cả tài liệu học tập`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation
    const secondConfirm = window.confirm(
      'Cảnh báo: Đây là lần xác nhận cuối cùng. Bạn có chắc chắn muốn xóa lớp học này?'
    );
    if (!secondConfirm) {
      return;
    }

    try {
      await api.delete(`/classes/${id}`);
      alert('Xóa lớp học thành công!');
      navigate('/classes'); // Navigate back to class list
    } catch (error) {
      console.error('Delete class error:', error);
      alert(error.response?.data?.message || 'Xóa lớp học thất bại. Vui lòng thử lại.');
    }
  };

  // Handle update class settings
  const handleUpdateSettings = async () => {
    try {
      const response = await api.put(`/classes/${id}`, {
        name: settings.name || null,
        capacity: settings.capacity ? parseInt(settings.capacity) : null,
        planned_sessions: settings.planned_sessions ? parseInt(settings.planned_sessions) : null,
        schedule_days: settings.schedule_days || null,
        schedule_periods: settings.schedule_periods || null,
        start_date: settings.start_date || null,
        end_date: settings.end_date || null,
        image_url: settings.image_url || null,
        default_duration_min: settings.default_duration_min
          ? parseInt(settings.default_duration_min)
          : null,
        default_late_after_min: settings.default_late_after_min
          ? parseInt(settings.default_late_after_min)
          : null,
        default_method: settings.default_method,
      });

      if (response.data.success) {
        alert('Cập nhật cài đặt thành công!');
        fetchClassDetail();
      }
    } catch (error) {
      console.error('Update settings error:', error);
      alert(error.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  return (
    <div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải...</p>
        </div>
      ) : !classInfo ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Không tìm thấy lớp học</p>
        </div>
      ) : (
        <>
          {/* Class Header */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-blue-600">
              Lớp Học: {classInfo.name || classInfo.course?.name}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'students'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Danh Sách SV
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
              Buổi Học Đã Xong
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'attendance'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Điểm Danh
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'report'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Báo Cáo
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-2 px-4 font-medium ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              Cài Đặt Lớp Học
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'students' && (
            <div>
              {/* Next Upcoming Session Info */}
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
                const ongoingSession = sessionsWithStatus.find(s => s.realTimeStatus === 'ONGOING');

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
                      className={`mb-6 p-4 rounded-lg border shadow-sm ${isOngoing ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3
                            className={`text-lg font-semibold mb-2 ${isOngoing ? 'text-green-800' : 'text-blue-800'}`}
                          >
                            {isOngoing
                              ? '🟢 Buổi học đang diễn ra'
                              : '📅 Buổi học sắp tới gần nhất'}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Ngày:</span>
                              <p className="font-medium text-gray-800">
                                {dayName},{' '}
                                {sessionDate.toLocaleDateString('vi-VN', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Thời gian:</span>
                              <p className="font-medium text-gray-800">
                                {nextSession.start_time}
                                {nextSession.end_time ? ` - ${nextSession.end_time}` : ''}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Phòng:</span>
                              <p className="font-medium text-gray-800">
                                {nextSession.room || 'Chưa có'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600">Chủ đề:</span>
                              <p className="font-medium text-gray-800">
                                {nextSession.topic || 'Chưa có'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewSessionDetail(nextSession)}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm whitespace-nowrap"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Search and Sort Bar */}
              <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc mã sinh viên..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-gray-600">Sắp xếp:</label>
                  <select
                    value={sortField}
                    onChange={e => setSortField(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full_name">Họ và tên</option>
                    <option value="student_code">Mã SV</option>
                    <option value="attendance_rate">Tỉ lệ chuyên cần</option>
                    <option value="total_sessions">Số buổi</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedStudents.length === students.length && students.length > 0
                          }
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedStudents(students.map(s => s.student_id));
                            } else {
                              setSelectedStudents([]);
                            }
                          }}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-4">STT</th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSortField('full_name')}
                      >
                        Họ và tên {sortField === 'full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSortField('student_code')}
                      >
                        MSVV {sortField === 'student_code' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSortField('total_sessions')}
                      >
                        Tổng số buổi{' '}
                        {sortField === 'total_sessions' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSortField('attendance_rate')}
                      >
                        Tỉ lệ chuyên cần{' '}
                        {sortField === 'attendance_rate' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Filter and sort students
                      const filteredStudents = students.filter(student => {
                        const searchLower = studentSearch.toLowerCase();
                        return (
                          student.full_name.toLowerCase().includes(searchLower) ||
                          student.student_code.toLowerCase().includes(searchLower)
                        );
                      });

                      // Sort students
                      filteredStudents.sort((a, b) => {
                        let aVal = a[sortField];
                        let bVal = b[sortField];

                        // Handle attendance_rate (string like "85.5%")
                        if (sortField === 'attendance_rate') {
                          aVal = parseFloat(aVal) || 0;
                          bVal = parseFloat(bVal) || 0;
                        }

                        if (sortOrder === 'asc') {
                          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                        } else {
                          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                        }
                      });

                      if (filteredStudents.length === 0) {
                        return (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              {studentSearch ? 'Không tìm thấy sinh viên' : 'Chưa có sinh viên nào'}
                            </td>
                          </tr>
                        );
                      }

                      return filteredStudents.map((student, index) => (
                        <tr
                          key={student.student_id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.student_id)}
                              onChange={() => handleToggleStudentSelection(student.student_id)}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">{index + 1}</td>
                          <td className="py-3 px-4">{student.full_name}</td>
                          <td className="py-3 px-4 font-mono">{student.student_code}</td>
                          <td className="py-3 px-4 text-center">{student.total_sessions || 0}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`font-semibold ${
                                parseFloat(student.attendance_rate) >= 80
                                  ? 'text-green-600'
                                  : parseFloat(student.attendance_rate) >= 60
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {student.attendance_rate || '0%'}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                Tổng số: {students.length} sinh viên
                {studentSearch &&
                  ` (${
                    students.filter(
                      s =>
                        s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.student_code.toLowerCase().includes(studentSearch.toLowerCase())
                    ).length
                  } kết quả)`}
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Thêm Sinh Viên
                </button>
                <button
                  onClick={handleDeleteStudents}
                  disabled={selectedStudents.length === 0}
                  className={`px-6 py-2 rounded-lg transition font-semibold ${
                    selectedStudents.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Xóa {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div>
              {/* Header with Create Session Button */}
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">Buổi Học Sắp Tới</h3>
                <button
                  onClick={() => setShowCreateSessionModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  + Tạo Buổi Học
                </button>
              </div>

              {/* Upcoming Sessions - Smart Layout */}
              <div>
                {(() => {
                  const now = new Date();
                  const today = new Date().toISOString().split('T')[0];

                  // Calculate real-time status for each session (client-side)
                  const calculateSessionStatus = session => {
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
                  };

                  const sessionsWithStatus = sessions.map(calculateSessionStatus);

                  const upcomingSessions = sessionsWithStatus
                    .filter(s => {
                      if (s.status === 'CANCELLED') return false;
                      const sessionStatus = s.realTimeStatus || s.status;
                      return (
                        sessionStatus === 'UPCOMING' ||
                        sessionStatus === 'ONGOING' ||
                        (s.date >= today && sessionStatus !== 'FINISHED')
                      );
                    })
                    .sort((a, b) => {
                      if (a.date !== b.date) return a.date.localeCompare(b.date);
                      return (a.start_time || '').localeCompare(b.start_time || '');
                    });

                  if (upcomingSessions.length === 0) {
                    return (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center border-2 border-dashed border-blue-200">
                        <div className="text-4xl mb-3">📅</div>
                        <p className="text-gray-700 font-medium text-lg mb-1">
                          Chưa có buổi học sắp tới
                        </p>
                        <p className="text-gray-500 text-sm">Tạo buổi học mới để bắt đầu</p>
                      </div>
                    );
                  }

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
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    if (start <= today && today <= end) {
                      return 'Tuần này';
                    }
                    const nextWeek = new Date(today);
                    nextWeek.setDate(
                      today.getDate() + 7 - today.getDay() + (today.getDay() === 0 ? -6 : 1)
                    );
                    if (start.getTime() === nextWeek.getTime()) {
                      return 'Tuần sau';
                    }
                    return `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
                  };

                  // Helper to calculate days until session
                  const getDaysUntil = dateStr => {
                    const sessionDate = new Date(dateStr);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    sessionDate.setHours(0, 0, 0, 0);
                    const diffTime = sessionDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays;
                  };

                  return (
                    <div className="space-y-6 max-w-6xl mx-auto">
                      {weekKeys.map(weekKey => {
                        const weekSessions = weekGroups[weekKey];

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

                                return (
                                  <div
                                    key={session.session_id}
                                    onClick={() => handleViewSessionDetail(session)}
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
                                            year: 'numeric',
                                          })}
                                        </p>
                                        <div className="space-y-1.5 text-sm text-gray-700">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">📍</span>
                                            <span
                                              className={`font-medium ${!session.room ? 'text-gray-400 italic' : ''}`}
                                            >
                                              {session.room || 'Chưa có phòng'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">🕐</span>
                                            <span className="font-semibold text-blue-600">
                                              {session.start_time}
                                              {session.end_time ? ` - ${session.end_time}` : ''}
                                            </span>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-400 mt-0.5">📝</span>
                                            <span
                                              className={`font-medium line-clamp-2 ${!session.topic ? 'text-gray-400 italic' : ''}`}
                                            >
                                              {session.topic || 'Chưa có chủ đề'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleEditSession(session);
                                        }}
                                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
                                      >
                                        ✏️ Đổi Lịch
                                      </button>
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          setSelectedSessionDetail(session);
                                          setShowDeleteSessionConfirm(true);
                                        }}
                                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition shadow-sm"
                                      >
                                        🗑️ Xóa
                                      </button>
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
                })()}
              </div>
            </div>
          )}

          {activeTab === 'finished' && (
            <div>
              {/* Header with Create Session Button */}
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">Buổi Học Đã Xong</h3>
                <button
                  onClick={() => setShowCreateSessionModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  + Tạo Buổi Học
                </button>
              </div>

              {/* Finished Sessions - Smart Layout */}
              <div>
                {(() => {
                  const now = new Date();

                  // Calculate real-time status for each session (client-side)
                  const calculateSessionStatus = session => {
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
                  };

                  const sessionsWithStatus = sessions.map(calculateSessionStatus);

                  const finishedSessions = sessionsWithStatus
                    .filter(s => {
                      const sessionStatus = s.realTimeStatus || s.status;
                      return sessionStatus === 'FINISHED' || s.status === 'FINISHED';
                    })
                    .sort((a, b) => {
                      if (a.date !== b.date) return b.date.localeCompare(a.date);
                      return (b.start_time || '').localeCompare(a.start_time || '');
                    });

                  if (finishedSessions.length === 0) {
                    return (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 text-center border-2 border-dashed border-green-200">
                        <div className="text-4xl mb-3">✅</div>
                        <p className="text-gray-700 font-medium text-lg mb-1">
                          Chưa có buổi học nào đã kết thúc
                        </p>
                        <p className="text-gray-500 text-sm">
                          Các buổi học đã hoàn thành sẽ hiển thị ở đây
                        </p>
                      </div>
                    );
                  }

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
                    <div className="space-y-6 max-w-6xl mx-auto">
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
                                <h4 className="font-semibold text-lg">{getMonthLabel(monthKey)}</h4>
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

                                return (
                                  <div
                                    key={session.session_id}
                                    id={`session-${session.session_id}`}
                                    className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border-l-4 border-green-500 hover:shadow-md transition-all"
                                  >
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          <h5 className="font-bold text-gray-800 text-base">
                                            {dayName}
                                          </h5>
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                                            Đã kết thúc
                                          </span>
                                          {daysAgo === 0 && (
                                            <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-semibold">
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
                                            year: 'numeric',
                                          })}
                                        </p>
                                        <div className="space-y-1.5 text-sm text-gray-700">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">📍</span>
                                            <span
                                              className={`font-medium ${!session.room ? 'text-gray-400 italic' : ''}`}
                                            >
                                              {session.room || 'Chưa có phòng'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-400">🕐</span>
                                            <span className="font-semibold text-gray-800">
                                              {session.start_time}
                                              {session.end_time ? ` - ${session.end_time}` : ''}
                                            </span>
                                          </div>
                                          <div className="flex items-start gap-2">
                                            <span className="text-gray-400 mt-0.5">📝</span>
                                            <span
                                              className={`font-medium line-clamp-2 ${!session.topic ? 'text-gray-400 italic' : ''}`}
                                            >
                                              {session.topic || 'Chưa có chủ đề'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                      {session.hasQR && (
                                        <button
                                          onClick={() => {
                                            const protocol = window.location.protocol;
                                            const hostname = window.location.hostname;
                                            const port =
                                              window.location.port ||
                                              (protocol === 'https:' ? '443' : '80');
                                            const qrURL = `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}/student/scan?token=${session.qrToken}`;

                                            setQrData({
                                              token: session.qrToken,
                                              url: qrURL,
                                              expiresAt: session.qrExpiresAt,
                                              locationRadius: session.locationRadius || 15,
                                              teacherLatitude: session.teacherLatitude,
                                              teacherLongitude: session.teacherLongitude,
                                              sessionInfo: {
                                                date: session.date,
                                                time: `${session.start_time}${session.end_time ? ` - ${session.end_time}` : ''}`,
                                                room: session.room || 'Chưa có',
                                                topic: session.topic || 'Chưa có',
                                              },
                                            });
                                            setShowQRModal(true);
                                          }}
                                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                                        >
                                          📱 Xem QR
                                        </button>
                                      )}
                                      <button
                                        onClick={async () => {
                                          if (session.attendanceSessionId) {
                                            await fetchAttendanceRecords(
                                              session.attendanceSessionId
                                            );
                                            setShowAttendanceListModal(true);
                                          } else {
                                            alert('Chưa có phiên điểm danh cho buổi học này');
                                          }
                                        }}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition"
                                      >
                                        👥 Xem DS Điểm Danh
                                      </button>
                                    </div>

                                    {/* Materials */}
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">
                                          Tài liệu học tập:
                                        </span>
                                        <button
                                          onClick={() => {
                                            setSelectedSessionId(session.session_id);
                                            setShowMaterialModal(true);
                                          }}
                                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                        >
                                          + Thêm tài liệu
                                        </button>
                                      </div>
                                      {session.materials && session.materials.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                          {session.materials.map(material => (
                                            <div
                                              key={material.material_id}
                                              className="group relative bg-blue-50 rounded-lg px-3 py-2 border border-blue-200 hover:bg-blue-100 transition flex items-center gap-2"
                                            >
                                              <span
                                                className="text-xs font-medium text-blue-700 cursor-pointer flex-1"
                                                onClick={() =>
                                                  window.open(material.file_url, '_blank')
                                                }
                                                title={material.name}
                                              >
                                                📄 {material.name}
                                                {material.file_size && (
                                                  <span className="text-gray-500 ml-1">
                                                    ({formatFileSize(material.file_size)})
                                                  </span>
                                                )}
                                              </span>
                                              <button
                                                onClick={async e => {
                                                  e.stopPropagation();
                                                  if (
                                                    window.confirm(
                                                      `Bạn có chắc chắn muốn xóa tài liệu "${material.name}"?`
                                                    )
                                                  ) {
                                                    try {
                                                      const response = await api.delete(
                                                        `/materials/${material.material_id}`
                                                      );
                                                      if (response.data.success) {
                                                        alert('Xóa tài liệu thành công!');
                                                        fetchSessions();
                                                      }
                                                    } catch (error) {
                                                      console.error(
                                                        'Delete material error:',
                                                        error
                                                      );
                                                      alert(
                                                        error.response?.data?.message ||
                                                          'Xóa tài liệu thất bại'
                                                      );
                                                    }
                                                  }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-xs px-1 transition"
                                                title="Xóa tài liệu"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 italic">
                                          Chưa có tài liệu nào
                                        </p>
                                      )}
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
                })()}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div>
              <div className="mb-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-gray-800">Chi Tiết Điểm Danh</h3>
                  {attendanceData && (
                    <div className="flex gap-4 text-sm">
                      <div className="bg-green-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Đúng giờ: </span>
                        <span className="font-semibold text-green-600">
                          {(() => {
                            let filtered = allAttendanceRecords;
                            if (selectedSessionFilter !== 'all') {
                              filtered = filtered.filter(
                                r => r.session?.session_id === parseInt(selectedSessionFilter)
                              );
                            }
                            if (selectedDateFilter !== 'all') {
                              filtered = filtered.filter(r => {
                                const recordDate = r.session?.date
                                  ? new Date(r.session.date).toISOString().split('T')[0]
                                  : null;
                                return recordDate === selectedDateFilter;
                              });
                            }
                            return filtered.filter(r => r.status === 'PRESENT').length;
                          })()}
                        </span>
                      </div>
                      <div className="bg-yellow-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Muộn: </span>
                        <span className="font-semibold text-yellow-600">
                          {(() => {
                            let filtered = allAttendanceRecords;
                            if (selectedSessionFilter !== 'all') {
                              filtered = filtered.filter(
                                r => r.session?.session_id === parseInt(selectedSessionFilter)
                              );
                            }
                            if (selectedDateFilter !== 'all') {
                              filtered = filtered.filter(r => {
                                const recordDate = r.session?.date
                                  ? new Date(r.session.date).toISOString().split('T')[0]
                                  : null;
                                return recordDate === selectedDateFilter;
                              });
                            }
                            return filtered.filter(r => r.status === 'LATE').length;
                          })()}
                        </span>
                      </div>
                      {attendanceData.class.latitude && attendanceData.class.longitude && (
                        <>
                          <div className="bg-blue-50 px-3 py-2 rounded-lg">
                            <span className="text-gray-600">Hợp lệ: </span>
                            <span className="font-semibold text-blue-600">
                              {(() => {
                                let filtered = allAttendanceRecords;
                                if (selectedSessionFilter !== 'all') {
                                  filtered = filtered.filter(
                                    r => r.session?.session_id === parseInt(selectedSessionFilter)
                                  );
                                }
                                if (selectedDateFilter !== 'all') {
                                  filtered = filtered.filter(r => {
                                    const recordDate = r.session?.date
                                      ? new Date(r.session.date).toISOString().split('T')[0]
                                      : null;
                                    return recordDate === selectedDateFilter;
                                  });
                                }
                                return filtered.filter(r => r.location_valid === true).length;
                              })()}
                            </span>
                          </div>
                          <div className="bg-red-50 px-3 py-2 rounded-lg">
                            <span className="text-gray-600">Không hợp lệ: </span>
                            <span className="font-semibold text-red-600">
                              {(() => {
                                let filtered = allAttendanceRecords;
                                if (selectedSessionFilter !== 'all') {
                                  filtered = filtered.filter(
                                    r => r.session?.session_id === parseInt(selectedSessionFilter)
                                  );
                                }
                                if (selectedDateFilter !== 'all') {
                                  filtered = filtered.filter(r => {
                                    const recordDate = r.session?.date
                                      ? new Date(r.session.date).toISOString().split('T')[0]
                                      : null;
                                    return recordDate === selectedDateFilter;
                                  });
                                }
                                return filtered.filter(r => r.location_valid === false).length;
                              })()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Filter by Session and Date */}
                {allAttendanceRecords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">
                        Lọc theo buổi học:
                      </label>
                      <select
                        value={selectedSessionFilter}
                        onChange={e => {
                          setSelectedSessionFilter(e.target.value);
                          // Reset date filter when changing session filter
                          if (e.target.value !== 'all') {
                            setSelectedDateFilter('all');
                          }
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[250px]"
                      >
                        <option value="all">Tất cả các buổi</option>
                        {(() => {
                          // Get unique sessions from attendance records
                          const sessionMap = new Map();
                          allAttendanceRecords.forEach(record => {
                            const session = record.session;
                            if (session && session.session_id) {
                              if (!sessionMap.has(session.session_id)) {
                                sessionMap.set(session.session_id, {
                                  session_id: session.session_id,
                                  date: session.date,
                                  start_time: session.start_time,
                                  end_time: session.end_time,
                                  room: session.room,
                                  topic: session.topic,
                                });
                              }
                            }
                          });
                          // Sort by date (newest first)
                          const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => {
                            const dateA = new Date(a.date);
                            const dateB = new Date(b.date);
                            return dateB - dateA;
                          });
                          return sortedSessions.map(session => {
                            const dateStr = session.date
                              ? new Date(session.date).toLocaleDateString('vi-VN')
                              : 'N/A';
                            const timeStr = session.start_time
                              ? session.end_time
                                ? `${session.start_time} - ${session.end_time}`
                                : session.start_time
                              : '';
                            const label = session.topic
                              ? `${dateStr} ${timeStr} - ${session.topic}`
                              : `${dateStr} ${timeStr}`;
                            return (
                              <option key={session.session_id} value={session.session_id}>
                                {label}
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Lọc theo ngày:</label>
                      <select
                        value={selectedDateFilter}
                        onChange={e => {
                          setSelectedDateFilter(e.target.value);
                          // Reset session filter when changing date filter
                          if (e.target.value !== 'all') {
                            setSelectedSessionFilter('all');
                          }
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[200px]"
                      >
                        <option value="all">Tất cả các ngày</option>
                        {(() => {
                          // Get unique dates from attendance records
                          const dateMap = new Map();
                          allAttendanceRecords.forEach(record => {
                            if (record.session?.date) {
                              const date = new Date(record.session.date);
                              const dateKey = date.toISOString().split('T')[0];
                              const dateLabel = date.toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              });
                              if (!dateMap.has(dateKey)) {
                                dateMap.set(dateKey, dateLabel);
                              }
                            }
                          });
                          // Sort by date (newest first)
                          const sortedDates = Array.from(dateMap.entries()).sort((a, b) => {
                            return new Date(b[0]) - new Date(a[0]);
                          });
                          return sortedDates.map(([dateKey, dateLabel]) => (
                            <option key={dateKey} value={dateKey}>
                              {dateLabel}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {(selectedSessionFilter !== 'all' || selectedDateFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSelectedSessionFilter('all');
                          setSelectedDateFilter('all');
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                )}
              </div>

              {allAttendanceLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Đang tải...</p>
                </div>
              ) : allAttendanceRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Chưa có điểm danh nào</p>
                </div>
              ) : (
                (() => {
                  // Filter records based on selected session and date
                  let filteredRecords = allAttendanceRecords;

                  if (selectedSessionFilter !== 'all') {
                    filteredRecords = filteredRecords.filter(
                      r => r.session?.session_id === parseInt(selectedSessionFilter)
                    );
                  }

                  if (selectedDateFilter !== 'all') {
                    filteredRecords = filteredRecords.filter(r => {
                      const recordDate = r.session?.date
                        ? new Date(r.session.date).toISOString().split('T')[0]
                        : null;
                      return recordDate === selectedDateFilter;
                    });
                  }

                  if (filteredRecords.length === 0) {
                    return (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">
                          {selectedSessionFilter !== 'all' || selectedDateFilter !== 'all'
                            ? 'Không có điểm danh nào phù hợp với bộ lọc đã chọn'
                            : 'Chưa có điểm danh nào'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredRecords.map(record => (
                        <div
                          key={record.record_id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-semibold text-gray-800 text-lg">
                                  {record.student.full_name}
                                </h4>
                                <span className="text-sm text-gray-500">
                                  ({record.student.student_code})
                                </span>
                                <span
                                  className={`px-3 py-1 rounded text-xs font-semibold ${
                                    record.status === 'PRESENT'
                                      ? 'bg-green-100 text-green-700'
                                      : record.status === 'LATE'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {record.status === 'PRESENT'
                                    ? '✅ Đúng giờ'
                                    : record.status === 'LATE'
                                      ? '⏰ Muộn'
                                      : '❌ Vắng'}
                                </span>
                                {/* Hiển thị trạng thái vị trí nếu lớp có vị trí */}
                                {attendanceData?.class.latitude &&
                                  attendanceData?.class.longitude && (
                                    <span
                                      className={`px-3 py-1 rounded text-xs font-semibold ${
                                        record.location_valid === true
                                          ? 'bg-blue-100 text-blue-700'
                                          : record.location_valid === false
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {record.location_valid === true
                                        ? '✅ Vị trí hợp lệ'
                                        : record.location_valid === false
                                          ? '❌ Vị trí không hợp lệ'
                                          : '⚠️ Không có GPS'}
                                    </span>
                                  )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Buổi học:</span>{' '}
                                  {record.session?.date
                                    ? new Date(record.session.date).toLocaleDateString('vi-VN')
                                    : 'N/A'}{' '}
                                  {record.session?.start_time || ''}
                                  {record.session?.end_time ? ` - ${record.session.end_time}` : ''}
                                </div>
                                <div>
                                  <span className="font-medium">Phòng:</span>{' '}
                                  {record.session?.room || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Thời gian điểm danh:</span>{' '}
                                  {record.checkin_time
                                    ? new Date(record.checkin_time).toLocaleString('vi-VN')
                                    : 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Nguồn:</span>{' '}
                                  {record.source || 'N/A'}
                                </div>
                                {record.session?.topic && (
                                  <div className="md:col-span-2">
                                    <span className="font-medium">Chủ đề:</span>{' '}
                                    {record.session.topic}
                                  </div>
                                )}
                              </div>
                              {/* Hiển thị thông tin vị trí */}
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="font-medium text-gray-700 mb-2">
                                  📍 Thông tin vị trí:
                                </p>
                                {record.latitude && record.longitude ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <a
                                        href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                                      >
                                        🗺️ Xem trên Google Maps
                                      </a>
                                      <span className="text-gray-500 text-xs">
                                        ({parseFloat(record.latitude).toFixed(6)},{' '}
                                        {parseFloat(record.longitude).toFixed(6)})
                                      </span>
                                    </div>
                                    {record.attendanceSession?.teacher_latitude &&
                                      record.attendanceSession?.teacher_longitude && (
                                        <div className="space-y-1">
                                          {record.distance_from_teacher !== null ? (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-600 text-sm">
                                                📏 Khoảng cách từ giáo viên:{' '}
                                                <span className="font-semibold">
                                                  {record.distance_from_teacher}m
                                                </span>
                                              </span>
                                              {record.attendanceSession?.location_radius && (
                                                <span className="text-gray-400 text-xs">
                                                  (Bán kính cho phép:{' '}
                                                  {record.attendanceSession.location_radius}m)
                                                </span>
                                              )}
                                            </div>
                                          ) : null}
                                          {record.location_valid !== null && (
                                            <div
                                              className={`text-sm font-medium ${
                                                record.location_valid
                                                  ? 'text-green-600'
                                                  : 'text-red-600'
                                              }`}
                                            >
                                              {record.location_valid
                                                ? '✅ Điểm danh trong phạm vi cho phép'
                                                : '❌ Điểm danh ngoài phạm vi cho phép'}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                ) : record.no_gps_reason ? (
                                  <div className="space-y-2">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                      <p className="font-medium text-yellow-800 mb-1">
                                        ⚠️ Lý do không có GPS:
                                      </p>
                                      <p className="text-sm text-yellow-700">
                                        {record.no_gps_reason}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-red-500 text-sm font-medium">
                                      ⚠️ Học sinh không cung cấp vị trí GPS khi điểm danh
                                    </p>
                                    {attendanceData?.class.latitude &&
                                      attendanceData?.class.longitude && (
                                        <p className="text-gray-500 text-xs">
                                          Lớp học có yêu cầu vị trí GPS. Điểm danh này không thể xác
                                          minh vị trí.
                                        </p>
                                      )}
                                  </div>
                                )}

                                {/* Validation Status and Actions */}
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-700">
                                        Trạng thái đánh giá:
                                      </span>
                                      {(() => {
                                        // Convert to number for comparison (handle boolean, string, or number)
                                        const isValid = record.is_valid;
                                        const isValidNum =
                                          isValid === null || isValid === undefined
                                            ? null
                                            : Number(isValid);

                                        if (isValidNum === null) {
                                          return (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                                              ⏳ Chờ đánh giá
                                            </span>
                                          );
                                        } else if (isValidNum === 1) {
                                          return (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                              ✅ Hợp lệ
                                            </span>
                                          );
                                        } else {
                                          return (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                              ❌ Không hợp lệ
                                            </span>
                                          );
                                        }
                                      })()}
                                    </div>

                                    {/* Validation Actions */}
                                    <div className="flex gap-2">
                                      {record.is_valid === null && (
                                        <>
                                          <button
                                            onClick={async () => {
                                              try {
                                                const response = await api.put(
                                                  `/attendance/${record.record_id}`,
                                                  {
                                                    is_valid: 1,
                                                  }
                                                );
                                                if (response.data.success) {
                                                  alert('Đã đánh giá điểm danh là hợp lệ');
                                                  fetchAllAttendanceRecords();
                                                }
                                              } catch (error) {
                                                alert(
                                                  error.response?.data?.message ||
                                                    'Cập nhật thất bại'
                                                );
                                              }
                                            }}
                                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                                            title="Đánh giá hợp lệ"
                                          >
                                            ✅ Hợp lệ
                                          </button>
                                          <button
                                            onClick={async () => {
                                              try {
                                                const response = await api.put(
                                                  `/attendance/${record.record_id}`,
                                                  {
                                                    is_valid: 0,
                                                  }
                                                );
                                                if (response.data.success) {
                                                  alert('Đã đánh giá điểm danh là không hợp lệ');
                                                  fetchAllAttendanceRecords();
                                                }
                                              } catch (error) {
                                                alert(
                                                  error.response?.data?.message ||
                                                    'Cập nhật thất bại'
                                                );
                                              }
                                            }}
                                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                                            title="Đánh giá không hợp lệ"
                                          >
                                            ❌ Không hợp lệ
                                          </button>
                                        </>
                                      )}
                                      {(record.is_valid === 1 || record.is_valid === 0) && (
                                        <button
                                          onClick={async () => {
                                            try {
                                              const response = await api.put(
                                                `/attendance/${record.record_id}`,
                                                {
                                                  is_valid: record.is_valid === 1 ? 0 : 1,
                                                }
                                              );
                                              if (response.data.success) {
                                                alert(
                                                  `Đã đổi đánh giá thành ${record.is_valid === 1 ? 'không hợp lệ' : 'hợp lệ'}`
                                                );
                                                fetchAllAttendanceRecords();
                                              }
                                            } catch (error) {
                                              alert(
                                                error.response?.data?.message || 'Cập nhật thất bại'
                                              );
                                            }
                                          }}
                                          className={`px-3 py-1 rounded text-sm transition ${
                                            record.is_valid === 1
                                              ? 'bg-red-600 text-white hover:bg-red-700'
                                              : 'bg-green-600 text-white hover:bg-green-700'
                                          }`}
                                          title={
                                            record.is_valid === 1
                                              ? 'Đổi thành không hợp lệ'
                                              : 'Đổi thành hợp lệ'
                                          }
                                        >
                                          {record.is_valid === 1 ? '❌ Đổi' : '✅ Đổi'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Báo Cáo Điểm Danh Lớp Học</h3>
                <button
                  onClick={handleExportClassReport}
                  disabled={
                    !classReport || !classReport.students || classReport.students.length === 0
                  }
                  className={`px-4 py-2 rounded-lg transition font-semibold ${
                    !classReport || !classReport.students || classReport.students.length === 0
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  📥 Xuất File
                </button>
              </div>

              {reportLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Đang tải báo cáo...</p>
                </div>
              ) : !classReport || !classReport.overview ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Không có dữ liệu báo cáo</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Vui lòng đảm bảo lớp học đã có các buổi học đã kết thúc và có điểm danh
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Overview Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="text-lg font-semibold mb-4">Tổng Quan Điểm Danh</h4>
                    {classReport.overview && classReport.overview.total_records > 0 ? (
                      <>
                        <div className="flex items-center justify-center mb-6">
                          <div className="relative w-56 h-56">
                            <svg className="transform -rotate-90" viewBox="0 0 200 200">
                              <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="40"
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="40"
                                strokeDasharray={`${(classReport.overview.on_time / 100) * 502.4} 502.4`}
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="40"
                                strokeDasharray={`${(classReport.overview.late / 100) * 502.4} 502.4`}
                                strokeDashoffset={`-${(classReport.overview.on_time / 100) * 502.4}`}
                              />
                              <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="40"
                                strokeDasharray={`${(classReport.overview.absent / 100) * 502.4} 502.4`}
                                strokeDashoffset={`-${((classReport.overview.on_time + classReport.overview.late) / 100) * 502.4}`}
                              />
                              <text
                                x="100"
                                y="105"
                                textAnchor="middle"
                                className="text-3xl font-bold fill-gray-800"
                                transform="rotate(90 100 100)"
                              >
                                {classReport.overview.on_time + classReport.overview.late}%
                              </text>
                              <text
                                x="100"
                                y="125"
                                textAnchor="middle"
                                className="text-sm fill-gray-600"
                                transform="rotate(90 100 100)"
                              >
                                Có mặt
                              </text>
                            </svg>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                              <div>
                                <span className="font-medium">Đúng giờ</span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Điểm danh trong 15 phút đầu
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                {classReport.overview.on_time}%
                              </div>
                              <div className="text-xs text-gray-600">
                                {classReport.overview.on_time_count} lượt
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                              <div>
                                <span className="font-medium">Muộn</span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Điểm danh sau 15 phút
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-blue-600">
                                {classReport.overview.late}%
                              </div>
                              <div className="text-xs text-gray-600">
                                {classReport.overview.late_count} lượt
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-yellow-500 rounded-full"></div>
                              <span className="font-medium">Vắng</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-yellow-600">
                                {classReport.overview.absent}%
                              </div>
                              <div className="text-xs text-gray-600">
                                {classReport.overview.absent_count} lượt
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="font-semibold text-gray-700 mb-3">
                              Thống kê hợp lệ/không hợp lệ:
                            </h5>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                                  <span className="text-sm font-medium">Hợp lệ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-600 text-sm">
                                    {classReport.overview.valid_count || 0} lượt
                                  </span>
                                  {(classReport.overview.valid || 0) === 100 && (
                                    <span className="text-xs text-emerald-600 font-medium">
                                      (100%)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                                  <span className="text-sm font-medium">Không hợp lệ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-orange-600 text-sm">
                                    {classReport.overview.invalid_count || 0} lượt
                                  </span>
                                  {(classReport.overview.invalid || 0) === 100 && (
                                    <span className="text-xs text-orange-600 font-medium">
                                      (100%)
                                    </span>
                                  )}
                                </div>
                              </div>
                              {classReport.overview.pending_count > 0 && (
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                                    <span className="text-sm font-medium">Chờ đánh giá</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-600 text-sm">
                                      {classReport.overview.pending_count || 0} lượt
                                    </span>
                                    {(classReport.overview.pending || 0) === 100 && (
                                      <span className="text-xs text-gray-600 font-medium">
                                        (100%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-700">Tổng số buổi học:</span>
                              <span className="font-bold text-gray-900">
                                {classReport.overview.total_sessions}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-700">Tổng số bản ghi:</span>
                              <span className="font-bold text-gray-900">
                                {classReport.overview.total_records}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Chưa có dữ liệu điểm danh</p>
                      </div>
                    )}
                  </div>

                  {/* Student List Card */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="text-lg font-semibold mb-4">Danh Sách Sinh Viên</h4>
                    {classReport.students && classReport.students.length > 0 ? (
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                STT
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Họ và tên
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                MSVV
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Tổng buổi
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Đúng giờ
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Muộn
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Vắng
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Tỉ lệ
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Hợp lệ
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                                Không hợp lệ
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {classReport.students.map((student, index) => (
                              <tr
                                key={student.student_id}
                                className="border-b border-gray-100 hover:bg-gray-50"
                              >
                                <td className="py-3 px-4">{index + 1}</td>
                                <td className="py-3 px-4 font-medium">{student.full_name}</td>
                                <td className="py-3 px-4">{student.student_code}</td>
                                <td className="py-3 px-4">{student.total_sessions}</td>
                                <td className="py-3 px-4 text-green-600 font-semibold">
                                  {student.on_time || 0}
                                </td>
                                <td className="py-3 px-4 text-blue-600 font-semibold">
                                  {student.late || 0}
                                </td>
                                <td className="py-3 px-4 text-yellow-600 font-semibold">
                                  {student.absent || 0}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`font-semibold ${
                                      parseFloat(student.attendance_rate) >= 80
                                        ? 'text-green-600'
                                        : parseFloat(student.attendance_rate) >= 60
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                    }`}
                                  >
                                    {student.attendance_rate}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-semibold">
                                      {student.valid_count || 0}
                                    </span>
                                    {parseFloat(student.valid_rate || '0') === 100 && (
                                      <span className="text-xs text-emerald-600 font-medium">
                                        (100%)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-orange-600 font-semibold">
                                      {student.invalid_count || 0}
                                    </span>
                                    {parseFloat(student.invalid_rate || '0') === 100 && (
                                      <span className="text-xs text-orange-600 font-medium">
                                        (100%)
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Không có dữ liệu sinh viên</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-6">Cài Đặt Lớp Học</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hình ảnh minh họa
                  </label>
                  <div className="w-full h-64 bg-blue-50 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-blue-300">
                    {settings.image_url ? (
                      <img
                        src={settings.image_url}
                        alt="Class"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-6xl text-gray-400">+</span>
                        <p className="text-gray-600 mt-2">Thêm hình ảnh</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="URL hình ảnh"
                    value={settings.image_url}
                    onChange={e => setSettings({ ...settings, image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên lớp (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      onChange={e => setSettings({ ...settings, name: e.target.value })}
                      placeholder="Tên lớp"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mã lớp</label>
                    <input
                      type="text"
                      value={settings.class_code}
                      disabled
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Mã lớp không thể thay đổi</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số SV tối đa
                    </label>
                    <input
                      type="number"
                      value={settings.capacity}
                      onChange={e => setSettings({ ...settings, capacity: e.target.value })}
                      placeholder="Số SV tối đa"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số buổi học dự kiến
                    </label>
                    <input
                      type="number"
                      value={settings.planned_sessions}
                      onChange={e => setSettings({ ...settings, planned_sessions: e.target.value })}
                      placeholder="Số buổi học"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="mt-8 border-t pt-6">
                <h4 className="text-lg font-semibold mb-4">Lịch Dạy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thứ học (VD: 2,4,6)
                    </label>
                    <input
                      type="text"
                      value={settings.schedule_days}
                      onChange={e => setSettings({ ...settings, schedule_days: e.target.value })}
                      placeholder="Thứ học (2=Thứ 2, 3=Thứ 3, ...)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nhập các thứ cách nhau bởi dấu phẩy (VD: 2,4,6 cho Thứ 2, 4, 6)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tiết học (VD: 7-10)
                    </label>
                    <input
                      type="text"
                      value={settings.schedule_periods}
                      onChange={e => setSettings({ ...settings, schedule_periods: e.target.value })}
                      placeholder="Tiết học (VD: 7-10)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Nhập khoảng tiết học (VD: 7-10 cho tiết 7 đến 10)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày bắt đầu môn học <span className="text-gray-500 text-xs">(Tùy chọn)</span>
                    </label>
                    <input
                      type="date"
                      value={settings.start_date}
                      onChange={e => setSettings({ ...settings, start_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lịch dạy sẽ chỉ hiển thị từ ngày này trở đi
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày kết thúc môn học{' '}
                      <span className="text-gray-500 text-xs">(Tùy chọn)</span>
                    </label>
                    <input
                      type="date"
                      value={settings.end_date}
                      onChange={e => setSettings({ ...settings, end_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lịch dạy sẽ chỉ hiển thị đến ngày này
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendance Settings */}
              <div className="mt-8 border-t pt-6">
                <h4 className="text-lg font-semibold mb-4">Cài Đặt Điểm Danh</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời lượng mặc định (phút)
                    </label>
                    <input
                      type="number"
                      value={settings.default_duration_min}
                      onChange={e =>
                        setSettings({ ...settings, default_duration_min: e.target.value })
                      }
                      placeholder="90"
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cho phép muộn (phút)
                    </label>
                    <input
                      type="number"
                      value={settings.default_late_after_min}
                      onChange={e =>
                        setSettings({ ...settings, default_late_after_min: e.target.value })
                      }
                      placeholder="15"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phương thức điểm danh
                    </label>
                    <select
                      value={settings.default_method}
                      onChange={e => setSettings({ ...settings, default_method: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="QR">QR Code</option>
                      <option value="CODE">Mã Code</option>
                      <option value="MANUAL">Thủ công</option>
                      <option value="GEO">Vị trí</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={() => {
                    // Reset to original values
                    if (classInfo) {
                      setSettings({
                        name: classInfo.name || '',
                        class_code: classInfo.class_code || '',
                        capacity: classInfo.capacity || '',
                        planned_sessions: classInfo.planned_sessions || '',
                        schedule_days: classInfo.schedule_days || '',
                        schedule_periods: classInfo.schedule_periods || '',
                        start_date: classInfo.start_date || '',
                        end_date: classInfo.end_date || '',
                        image_url: classInfo.image_url || '',
                        default_duration_min: classInfo.default_duration_min || '90',
                        default_late_after_min: classInfo.default_late_after_min || '15',
                        default_method: classInfo.default_method || 'QR',
                      });
                    }
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateSettings}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Lưu Cài Đặt
                </button>
              </div>

              {/* Delete Class Section */}
              <div className="mt-8 pt-6 border-t border-red-200">
                <h4 className="text-lg font-semibold mb-4 text-red-600">Vùng Nguy Hiểm</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-4">
                    <span className="font-semibold text-red-600">Cảnh báo:</span> Xóa lớp học sẽ xóa
                    vĩnh viễn tất cả dữ liệu liên quan. Hành động này không thể hoàn tác.
                  </p>
                  <button
                    onClick={handleDeleteClass}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    🗑️ Xóa Lớp Học
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Student Modal */}
          {showAddStudentModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Thêm Sinh Viên</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã Sinh Viên
                    </label>
                    <input
                      type="text"
                      value={studentCode}
                      onChange={e => setStudentCode(e.target.value)}
                      placeholder="Nhập mã sinh viên"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          handleAddStudent();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-4 justify-end">
                    <button
                      onClick={() => {
                        setShowAddStudentModal(false);
                        setStudentCode('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleAddStudent}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Session Modal */}
          {showCreateSessionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Tạo Buổi Học Mới</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày học <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newSession.date}
                      onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giờ bắt đầu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={newSession.start_time}
                        onChange={e => setNewSession({ ...newSession, start_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giờ kết thúc
                      </label>
                      <input
                        type="time"
                        value={newSession.end_time}
                        onChange={e => setNewSession({ ...newSession, end_time: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phòng học
                    </label>
                    <input
                      type="text"
                      value={newSession.room}
                      onChange={e => setNewSession({ ...newSession, room: e.target.value })}
                      placeholder="VD: A112"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề</label>
                    <input
                      type="text"
                      value={newSession.topic}
                      onChange={e => setNewSession({ ...newSession, topic: e.target.value })}
                      placeholder="Chủ đề buổi học"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-4 justify-end">
                    <button
                      onClick={() => {
                        setShowCreateSessionModal(false);
                        setNewSession({
                          date: '',
                          start_time: '',
                          end_time: '',
                          room: '',
                          topic: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleCreateSession}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Tạo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upload Material Modal */}
          {showMaterialModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Thêm Tài Liệu</h3>
                  <button
                    onClick={() => {
                      setShowMaterialModal(false);
                      setMaterialName('');
                      setMaterialUrl('');
                      setSelectedSessionId(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên Tài Liệu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={materialName}
                      onChange={e => setMaterialName(e.target.value)}
                      placeholder="Nhập tên tài liệu"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL Tài Liệu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={materialUrl}
                      onChange={e => setMaterialUrl(e.target.value)}
                      placeholder="https://example.com/file.pdf hoặc https://drive.google.com/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      💡 Bạn có thể upload file lên Google Drive, OneDrive hoặc dịch vụ lưu trữ khác
                      và dán link vào đây. Đảm bảo link có quyền truy cập công khai hoặc có quyền
                      xem.
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Lưu ý:</strong> Hệ thống sẽ tự động nhận diện loại file từ URL. Nếu
                      file không mở được, vui lòng kiểm tra lại quyền truy cập của link.
                    </p>
                  </div>
                  <div className="flex gap-4 justify-end pt-2">
                    <button
                      onClick={() => {
                        setShowMaterialModal(false);
                        setMaterialName('');
                        setMaterialUrl('');
                        setSelectedSessionId(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleUploadMaterial}
                      disabled={!materialName.trim() || !materialUrl.trim()}
                      className={`px-4 py-2 rounded-lg transition ${
                        !materialName.trim() || !materialUrl.trim()
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Tải Lên
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Late After Selection Modal */}
          {showQRDurationModal && selectedSessionForQR && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Tạo QR Code Điểm Danh</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thời gian cho phép đi muộn (phút)
                    </label>
                    <select
                      id="qrLateAfterSelect"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={classInfo?.default_late_after_min || '15'}
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
                      Sau thời gian này, học sinh quét QR sẽ được tính là đi muộn. QR code sẽ tồn
                      tại đến khi buổi học kết thúc.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bán kính cho phép điểm danh (mét)
                    </label>
                    <select
                      id="qrLocationRadiusSelect"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="15"
                    >
                      <option value="10">10 mét</option>
                      <option value="11">11 mét</option>
                      <option value="12">12 mét</option>
                      <option value="13">13 mét</option>
                      <option value="14">14 mét</option>
                      <option value="15">15 mét</option>
                      <option value="16">16 mét</option>
                      <option value="17">17 mét</option>
                      <option value="18">18 mét</option>
                      <option value="19">19 mét</option>
                      <option value="20">20 mét</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Học sinh phải ở trong bán kính này so với vị trí của bạn (giáo viên) để điểm
                      danh hợp lệ. Hệ thống sẽ yêu cầu GPS khi tạo QR.
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
                        const locationRadius =
                          document.getElementById('qrLocationRadiusSelect').value;
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

          {/* Session Detail Modal */}
          {showSessionDetailModal &&
            selectedSessionDetail &&
            (() => {
              // Calculate real-time status for the selected session (client-side)
              const now = new Date();
              const sessionDate = new Date(selectedSessionDetail.date);
              const [startHour, startMinute] = (selectedSessionDetail.start_time || '00:00')
                .split(':')
                .map(Number);
              const sessionStartTime = new Date(sessionDate);
              sessionStartTime.setHours(startHour, startMinute, 0, 0);

              let sessionEndTime = null;
              if (selectedSessionDetail.end_time) {
                const [endHour, endMinute] = selectedSessionDetail.end_time.split(':').map(Number);
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-800">Chi Tiết Buổi Học</h3>
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

                    {/* Session Info */}
                    <div className="space-y-4 mb-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-500">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">📅 Ngày học</p>
                            <p className="font-semibold text-gray-800">
                              {new Date(selectedSessionDetail.date).toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">🕐 Thời gian</p>
                            <p className="font-semibold text-gray-800">
                              {selectedSessionDetail.start_time}
                              {selectedSessionDetail.end_time
                                ? ` - ${selectedSessionDetail.end_time}`
                                : ''}
                            </p>
                          </div>
                          {selectedSessionDetail.room && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">📍 Phòng học</p>
                              <p className="font-semibold text-gray-800">
                                {selectedSessionDetail.room}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-600 mb-1">📊 Trạng thái</p>
                            <p
                              className={`font-semibold ${
                                realTimeStatus === 'FINISHED'
                                  ? 'text-green-600'
                                  : realTimeStatus === 'ONGOING'
                                    ? 'text-blue-600'
                                    : 'text-gray-600'
                              }`}
                            >
                              {realTimeStatus === 'FINISHED'
                                ? 'Đã kết thúc'
                                : realTimeStatus === 'ONGOING'
                                  ? 'Đang diễn ra'
                                  : 'Sắp tới'}
                            </p>
                          </div>
                        </div>
                        {selectedSessionDetail.topic && (
                          <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-1">📝 Chủ đề</p>
                            <p className="font-semibold text-gray-800">
                              {selectedSessionDetail.topic}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Materials Section */}
                    <div className="mb-6 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-800">📚 Tài Liệu Học Tập</h4>
                        <button
                          onClick={() => {
                            setSelectedSessionId(selectedSessionDetail.session_id);
                            setShowMaterialModal(true);
                            // Don't close session detail modal, just open material modal on top
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                        >
                          + Thêm Tài Liệu
                        </button>
                      </div>
                      {selectedSessionDetail.materials &&
                      selectedSessionDetail.materials.length > 0 ? (
                        <div className="space-y-2">
                          {selectedSessionDetail.materials.map(material => (
                            <div
                              key={material.material_id}
                              className="group flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xl">📄</span>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="font-medium text-gray-800 truncate"
                                    title={material.name}
                                  >
                                    {material.name}
                                  </p>
                                  {material.file_size && (
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(material.file_size)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => window.open(material.file_url, '_blank')}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                                >
                                  Mở
                                </button>
                                <button
                                  onClick={async e => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        `Bạn có chắc chắn muốn xóa tài liệu "${material.name}"?`
                                      )
                                    ) {
                                      try {
                                        const response = await api.delete(
                                          `/materials/${material.material_id}`
                                        );
                                        if (response.data.success) {
                                          alert('Xóa tài liệu thành công!');
                                          fetchSessions();
                                          // Update selectedSessionDetail to refresh materials
                                          const updatedSession = sessions.find(
                                            s => s.session_id === selectedSessionDetail.session_id
                                          );
                                          if (updatedSession) {
                                            setSelectedSessionDetail(updatedSession);
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Delete material error:', error);
                                        alert(
                                          error.response?.data?.message || 'Xóa tài liệu thất bại'
                                        );
                                      }
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-sm px-2 transition"
                                  title="Xóa tài liệu"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">
                            Chưa có tài liệu nào cho buổi học này
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {realTimeStatus === 'ONGOING' ? (
                        <>
                          {selectedSessionDetail.hasQR && !selectedSessionDetail.qrExpired ? (
                            <button
                              onClick={() => {
                                const protocol = window.location.protocol;
                                const hostname = window.location.hostname;
                                const port =
                                  window.location.port || (protocol === 'https:' ? '443' : '80');
                                const qrURL = `${protocol}//${hostname}${port && port !== '80' && port !== '443' ? `:${port}` : ''}/student/scan?token=${selectedSessionDetail.qrToken}`;

                                setQrData({
                                  token: selectedSessionDetail.qrToken,
                                  url: qrURL,
                                  expiresAt: selectedSessionDetail.qrExpiresAt,
                                  locationRadius: selectedSessionDetail.locationRadius || 15,
                                  teacherLatitude: selectedSessionDetail.teacherLatitude,
                                  teacherLongitude: selectedSessionDetail.teacherLongitude,
                                  sessionInfo: {
                                    date: selectedSessionDetail.date,
                                    time: `${selectedSessionDetail.start_time}${selectedSessionDetail.end_time ? ` - ${selectedSessionDetail.end_time}` : ''}`,
                                    room: selectedSessionDetail.room || 'Chưa có',
                                    topic: selectedSessionDetail.topic || 'Chưa có',
                                  },
                                });
                                setShowQRModal(true);
                                setShowSessionDetailModal(false);
                              }}
                              className="w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                            >
                              ✅ Xem QR Đã Tạo
                            </button>
                          ) : selectedSessionDetail.canStartAttendance ? (
                            <button
                              onClick={() => {
                                handleOpenQRModal(selectedSessionDetail);
                                setShowSessionDetailModal(false);
                              }}
                              className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                            >
                              📱 Tạo QR Điểm Danh
                            </button>
                          ) : null}
                        </>
                      ) : selectedSessionDetail.canStartSession ? (
                        <button
                          onClick={() => {
                            handleStartSession(selectedSessionDetail);
                            setShowSessionDetailModal(false);
                          }}
                          className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                        >
                          ▶️ Bắt Đầu Lớp
                        </button>
                      ) : null}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            handleEditSession(selectedSessionDetail);
                            setShowSessionDetailModal(false);
                          }}
                          className="px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                        >
                          ✏️ Đổi Lịch Học
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteSessionConfirm(true);
                            setShowSessionDetailModal(false);
                          }}
                          className="px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                        >
                          🗑️ Xóa Lịch Học
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setShowSessionDetailModal(false);
                          setSelectedSessionDetail(null);
                        }}
                        className="w-full px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Edit Session Modal */}
          {showEditSessionModal && selectedSessionDetail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Đổi Lịch Học</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày học</label>
                    <input
                      type="date"
                      value={selectedSessionDetail.date}
                      onChange={e =>
                        setSelectedSessionDetail({ ...selectedSessionDetail, date: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giờ bắt đầu
                      </label>
                      <input
                        type="time"
                        value={selectedSessionDetail.start_time}
                        onChange={e =>
                          setSelectedSessionDetail({
                            ...selectedSessionDetail,
                            start_time: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Giờ kết thúc
                      </label>
                      <input
                        type="time"
                        value={selectedSessionDetail.end_time || ''}
                        onChange={e =>
                          setSelectedSessionDetail({
                            ...selectedSessionDetail,
                            end_time: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phòng học
                    </label>
                    <input
                      type="text"
                      value={selectedSessionDetail.room || ''}
                      onChange={e =>
                        setSelectedSessionDetail({ ...selectedSessionDetail, room: e.target.value })
                      }
                      placeholder="VD: A112"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề</label>
                    <input
                      type="text"
                      value={selectedSessionDetail.topic || ''}
                      onChange={e =>
                        setSelectedSessionDetail({
                          ...selectedSessionDetail,
                          topic: e.target.value,
                        })
                      }
                      placeholder="VD: Giới thiệu môn học"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditSessionModal(false);
                      setSelectedSessionDetail(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpdateSession}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Session Confirm Modal */}
          {showDeleteSessionConfirm && selectedSessionDetail && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold text-red-600 mb-4">Xác nhận xóa buổi học</h3>
                <p className="text-gray-700 mb-2">Bạn có chắc chắn muốn xóa buổi học này?</p>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Ngày:</span>{' '}
                    {new Date(selectedSessionDetail.date).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Thời gian:</span>{' '}
                    {selectedSessionDetail.start_time}
                    {selectedSessionDetail.end_time ? ` - ${selectedSessionDetail.end_time}` : ''}
                  </p>
                  {selectedSessionDetail.topic && (
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Chủ đề:</span> {selectedSessionDetail.topic}
                    </p>
                  )}
                </div>
                <p className="text-sm text-red-600 mb-4">⚠️ Hành động này không thể hoàn tác!</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteSessionConfirm(false);
                      setSelectedSessionDetail(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleDeleteSession}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    Xóa
                  </button>
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
                        <p>
                          📅 Ngày: {new Date(qrData.sessionInfo.date).toLocaleDateString('vi-VN')}
                        </p>
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
                      <h4 className="font-semibold text-blue-800 mb-2">
                        📍 Vị trí GPS nơi tạo QR:
                      </h4>
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
                            {qrData.locationRadius || 15}m
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
        </>
      )}

      {/* Attendance List Modal */}
      {showAttendanceListModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Danh Sách Điểm Danh</h3>
              <button
                onClick={() => {
                  setShowAttendanceListModal(false);
                  setAttendanceRecords([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {attendanceLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Đang tải...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Chưa có học sinh nào điểm danh</p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendanceRecords.map(record => (
                  <div
                    key={record.record_id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">
                            {record.student.full_name}
                          </h4>
                          <span className="text-sm text-gray-500">
                            ({record.student.student_code})
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              record.status === 'PRESENT'
                                ? 'bg-green-100 text-green-700'
                                : record.status === 'LATE'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {record.status === 'PRESENT'
                              ? '✅ Đúng giờ'
                              : record.status === 'LATE'
                                ? '⏰ Muộn'
                                : '❌ Vắng'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <span className="font-medium">Thời gian điểm danh:</span>{' '}
                            {record.checkin_time
                              ? new Date(record.checkin_time).toLocaleString('vi-VN')
                              : 'N/A'}
                          </p>
                          <p>
                            <span className="font-medium">Nguồn:</span> {record.source || 'N/A'}
                          </p>
                          {record.latitude && record.longitude ? (
                            <div className="mt-2">
                              <p className="font-medium text-gray-700 mb-1">📍 Vị trí điểm danh:</p>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                  Xem trên Google Maps
                                </a>
                                <span className="text-gray-500 text-xs">
                                  ({parseFloat(record.latitude).toFixed(6)},{' '}
                                  {parseFloat(record.longitude).toFixed(6)})
                                </span>
                              </div>
                            </div>
                          ) : record.no_gps_reason ? (
                            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                              <p className="font-medium text-yellow-800 mb-1">
                                ⚠️ Lý do không có GPS:
                              </p>
                              <p className="text-sm text-yellow-700">{record.no_gps_reason}</p>
                            </div>
                          ) : (
                            <p className="text-gray-400 text-xs mt-1">Không có thông tin vị trí</p>
                          )}

                          {/* Validation Status */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="font-medium text-gray-700">Trạng thái:</span>
                            {(() => {
                              // Convert to number for comparison (handle boolean, string, or number)
                              const isValid = record.is_valid;
                              const isValidNum =
                                isValid === null || isValid === undefined ? null : Number(isValid);

                              if (isValidNum === null) {
                                return (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                                    ⏳ Chờ đánh giá
                                  </span>
                                );
                              } else if (isValidNum === 1) {
                                return (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                    ✅ Hợp lệ
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                    ❌ Không hợp lệ
                                  </span>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Validation Actions */}
                      <div className="flex flex-col gap-2">
                        {record.is_valid === null && (
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const response = await api.put(
                                    `/attendance/${record.record_id}`,
                                    {
                                      is_valid: 1,
                                    }
                                  );
                                  if (response.data.success) {
                                    alert('Đã đánh giá điểm danh là hợp lệ');
                                    fetchAttendanceRecords(
                                      selectedSessionDetail?.attendanceSessionId
                                    );
                                  }
                                } catch (error) {
                                  alert(error.response?.data?.message || 'Cập nhật thất bại');
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                              title="Đánh giá hợp lệ"
                            >
                              ✅ Hợp lệ
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const response = await api.put(
                                    `/attendance/${record.record_id}`,
                                    {
                                      is_valid: 0,
                                    }
                                  );
                                  if (response.data.success) {
                                    alert('Đã đánh giá điểm danh là không hợp lệ');
                                    fetchAttendanceRecords(
                                      selectedSessionDetail?.attendanceSessionId
                                    );
                                  }
                                } catch (error) {
                                  alert(error.response?.data?.message || 'Cập nhật thất bại');
                                }
                              }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                              title="Đánh giá không hợp lệ"
                            >
                              ❌ Không hợp lệ
                            </button>
                          </div>
                        )}
                        {(record.is_valid === 1 || record.is_valid === 0) && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await api.put(`/attendance/${record.record_id}`, {
                                  is_valid: record.is_valid === 1 ? 0 : 1,
                                });
                                if (response.data.success) {
                                  alert(
                                    `Đã đổi đánh giá thành ${record.is_valid === 1 ? 'không hợp lệ' : 'hợp lệ'}`
                                  );
                                  fetchAttendanceRecords(
                                    selectedSessionDetail?.attendanceSessionId
                                  );
                                }
                              } catch (error) {
                                alert(error.response?.data?.message || 'Cập nhật thất bại');
                              }
                            }}
                            className={`px-3 py-1 rounded text-sm transition ${
                              record.is_valid === 1
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                            title={
                              record.is_valid === 1 ? 'Đổi thành không hợp lệ' : 'Đổi thành hợp lệ'
                            }
                          >
                            {record.is_valid === 1
                              ? '❌ Đổi thành không hợp lệ'
                              : '✅ Đổi thành hợp lệ'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowAttendanceListModal(false);
                  setAttendanceRecords([]);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                Đóng
              </button>
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

export default ClassDetail;
