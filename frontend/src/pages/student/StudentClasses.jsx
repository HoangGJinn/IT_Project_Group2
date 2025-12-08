import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import api from '../../utils/api';
import { formatScheduleDays, formatSchedulePeriods } from '../../utils/schedule';
import {
  generateAcademicYears,
  getSemesters,
  semesterDisplayToBackend,
} from '../../utils/academic';

function StudentClasses() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const academicYears = generateAcademicYears();
  const semesters = getSemesters();

  useEffect(() => {
    fetchClasses();
  }, [selectedYear, selectedSemester]);

  // Real-time search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchClasses();
    }, 300); // Wait 300ms after user stops typing for real-time search

    setSearchTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchTerm]);

  const handleSearch = () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    fetchClasses();
  };

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedYear) params.school_year = selectedYear;
      if (selectedSemester) {
        // Convert display value to backend value
        params.semester = semesterDisplayToBackend(selectedSemester);
      }
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/student/classes', { params });
      if (response.data.success) {
        setClasses(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch classes error:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-blue-600">Lớp Học Của Tôi</h1>

      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tất cả năm học</option>
          {academicYears.map(year => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>

        <select
          value={selectedSemester}
          onChange={e => setSelectedSemester(e.target.value)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tất cả học kì</option>
          {semesters.map(semester => (
            <option key={semester.value} value={semester.displayValue}>
              {semester.label}
            </option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            placeholder="Tìm kiếm lớp học..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-700 transition"
            title="Tìm kiếm"
          >
            <FaSearch className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Class Cards Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chưa có lớp học nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(classItem => (
            <div
              key={classItem.class_id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200"
              onClick={() => navigate(`/student/classes/${classItem.class_id}`)}
            >
              {/* Image */}
              {classItem.image_url ? (
                <img
                  src={classItem.image_url}
                  alt={classItem.name || classItem.course?.name}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {(classItem.name || classItem.course?.name || 'L').charAt(0)}
                    </div>
                    <p className="text-sm text-gray-600">Hình ảnh lớp học</p>
                  </div>
                </div>
              )}

              {/* Class Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {classItem.name || classItem.course?.name}
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Mã lớp:</span> {classItem.class_code}
                  </p>
                  {classItem.teacher && (
                    <p>
                      <span className="font-semibold">Giảng viên:</span>{' '}
                      {classItem.teacher.full_name}
                    </p>
                  )}
                  {classItem.schedule_days && (
                    <p>
                      <span className="font-semibold">Lịch học:</span>{' '}
                      {formatScheduleDays(classItem.schedule_days)}
                    </p>
                  )}
                  {classItem.schedule_periods && (
                    <p>
                      <span className="font-semibold">Tiết:</span>{' '}
                      {formatSchedulePeriods(classItem.schedule_periods)}
                    </p>
                  )}
                  {classItem.room && (
                    <p>
                      <span className="font-semibold">Phòng:</span> {classItem.room}
                    </p>
                  )}
                </div>

                {/* Attendance Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tỉ lệ chuyên cần:</span>
                    <span className="text-lg font-semibold text-green-600">
                      {classItem.attendance_rate || '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Số buổi:</span>
                    <span className="text-sm font-medium text-gray-700">
                      {classItem.attended_sessions || 0}/{classItem.total_sessions || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentClasses;
