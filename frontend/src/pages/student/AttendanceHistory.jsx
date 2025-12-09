import { useState, useEffect } from 'react';
import { FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';
import api from '../../utils/api';

function AttendanceHistory() {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [classes, setClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
    fetchAttendanceHistory();
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [selectedClass, selectedStatus]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/student/classes');
      if (response.data.success) {
        setClasses(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedClass !== 'all') params.class_id = selectedClass;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const response = await api.get('/student/attendance', { params });
      if (response.data.success) {
        setAttendanceRecords(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch attendance history error:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = status => {
    switch (status?.toUpperCase()) {
      case 'PRESENT':
      case 'ON_TIME':
        return {
          text: 'Đúng giờ',
          icon: FaCheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'LATE':
        return {
          text: 'Muộn',
          icon: FaClock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'ABSENT':
        return {
          text: 'Vắng',
          icon: FaTimesCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          text: 'Không xác định',
          icon: FaTimesCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  // Statistics
  const stats = {
    total: attendanceRecords.length,
    onTime: attendanceRecords.filter(
      r => r.status?.toUpperCase() === 'PRESENT' || r.status?.toUpperCase() === 'ON_TIME'
    ).length,
    late: attendanceRecords.filter(r => r.status?.toUpperCase() === 'LATE').length,
    absent: attendanceRecords.filter(r => r.status?.toUpperCase() === 'ABSENT').length,
    valid: attendanceRecords.filter(r => r.is_valid === 1).length,
    invalid: attendanceRecords.filter(r => r.is_valid === 0).length,
    pending: attendanceRecords.filter(r => r.is_valid === null).length,
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-blue-600">Lịch Sử Điểm Danh</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm mb-1">Tổng số buổi</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm mb-1">Đúng giờ</p>
          <p className="text-2xl font-bold text-green-600">{stats.onTime}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm mb-1">Muộn</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
          <p className="text-gray-600 text-sm mb-1">Vắng</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-emerald-500">
          <p className="text-gray-600 text-sm mb-1">Hợp lệ</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.valid}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
          <p className="text-gray-600 text-sm mb-1">Không hợp lệ</p>
          <p className="text-2xl font-bold text-orange-600">{stats.invalid}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-500">
          <p className="text-gray-600 text-sm mb-1">Chờ đánh giá</p>
          <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Lọc theo lớp học</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả lớp học</option>
              {classes.map(cls => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.name || cls.course?.name} ({cls.class_code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lọc theo trạng thái
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="PRESENT">Đúng giờ</option>
              <option value="LATE">Muộn</option>
              <option value="ABSENT">Vắng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">STT</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Lớp học</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Buổi học</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Ngày</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Giờ</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Phòng</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Đánh giá</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    Không có dữ liệu điểm danh
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record, index) => {
                  const statusInfo = getStatusInfo(record.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr
                      key={record.attendance_record_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-800">
                            {record.class?.name || record.class?.course?.name}
                          </p>
                          <p className="text-sm text-gray-500">{record.class?.class_code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">Buổi {record.session?.session_number || 'N/A'}</td>
                      <td className="py-3 px-4">
                        {record.session?.date
                          ? new Date(record.session.date).toLocaleDateString('vi-VN')
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {record.attendance_time
                          ? new Date(record.attendance_time).toLocaleTimeString('vi-VN')
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4">{record.session?.room || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} border ${statusInfo.color}`}
                        >
                          <StatusIcon />
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {record.is_valid === 1 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
                            <FaCheckCircle />
                            Hợp lệ
                          </span>
                        ) : record.is_valid === 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-200">
                            <FaTimesCircle />
                            Không hợp lệ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            ⏳ Chờ đánh giá
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AttendanceHistory;
