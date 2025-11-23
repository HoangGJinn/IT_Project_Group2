import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaUser, FaCalendar, FaClock, FaMapMarkerAlt, FaChartLine } from 'react-icons/fa';
import api from '../../utils/api';

function StudentClassDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('info');
  const [classInfo, setClassInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          day: data.schedule_days || 'Chưa có',
          period: data.schedule_periods || 'Chưa có',
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
          onClick={() => setActiveTab('sessions')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'sessions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Lịch Sử Buổi Học
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

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Chưa có buổi học nào</p>
            </div>
          ) : (
            sessions.map((session, index) => {
              // Check if student attended this session
              // This would need to be fetched from attendance records
              // For now, we'll show the session info
              return (
                <div
                  key={session.session_id || index}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Buổi {index + 1}</h3>
                      <p className="text-gray-600 mb-1">
                        <span className="font-semibold">Ngày:</span>{' '}
                        {new Date(session.date).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {session.topic && (
                        <p className="text-gray-600">
                          <span className="font-semibold">Chủ đề:</span> {session.topic}
                        </p>
                      )}
                      {session.room && (
                        <p className="text-gray-600">
                          <span className="font-semibold">Phòng:</span> {session.room}
                        </p>
                      )}
                      <p className="text-gray-600">
                        <span className="font-semibold">Trạng thái:</span>{' '}
                        {session.status === 'FINISHED'
                          ? 'Đã kết thúc'
                          : session.status === 'ONGOING'
                            ? 'Đang diễn ra'
                            : session.status === 'SCHEDULED'
                              ? 'Đã lên lịch'
                              : session.status}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
    </div>
  );
}

export default StudentClassDetail;
