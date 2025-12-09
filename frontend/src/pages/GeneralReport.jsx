import { useState, useEffect } from 'react';
import api from '../utils/api';
import { generateAcademicYears, getSemesters } from '../utils/academic';

function GeneralReport() {
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendanceData, setAttendanceData] = useState({
    onTime: 0,
    late: 0,
    absent: 0,
    onTimeCount: 0,
    lateCount: 0,
    absentCount: 0,
    totalRecords: 0,
    valid: 0,
    invalid: 0,
    pending: 0,
    validCount: 0,
    invalidCount: 0,
    pendingCount: 0,
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [courses, setCourses] = useState([]);

  const academicYears = generateAcademicYears();
  const semesters = getSemesters();

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedYear && selectedSemester) {
      fetchReport();
    }
  }, [selectedYear, selectedSemester, selectedSubject]);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch courses error:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_year: selectedYear,
        semester: selectedSemester === '1' ? 'HK1' : selectedSemester === '2' ? 'HK2' : 'HK3',
      });

      if (selectedSubject) {
        params.append('course_id', selectedSubject);
      }

      const response = await api.get(`/reports/attendance?${params.toString()}`);

      if (response.data.success) {
        const data = response.data.data;
        setAttendanceData({
          onTime: data.overview?.on_time || 0,
          late: data.overview?.late || 0,
          absent: data.overview?.absent || 0,
          onTimeCount: data.overview?.on_time_count || 0,
          lateCount: data.overview?.late_count || 0,
          absentCount: data.overview?.absent_count || 0,
          totalRecords: data.overview?.total_records || 0,
          valid: data.overview?.valid || 0,
          invalid: data.overview?.invalid || 0,
          pending: data.overview?.pending || 0,
          validCount: data.overview?.valid_count || 0,
          invalidCount: data.overview?.invalid_count || 0,
          pendingCount: data.overview?.pending_count || 0,
        });
        setStudents(data.students || []);
      } else {
        setAttendanceData({
          onTime: 0,
          late: 0,
          absent: 0,
          onTimeCount: 0,
          lateCount: 0,
          absentCount: 0,
          totalRecords: 0,
        });
        setStudents([]);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
      setAttendanceData({
        onTime: 0,
        late: 0,
        absent: 0,
        onTimeCount: 0,
        lateCount: 0,
        absentCount: 0,
        totalRecords: 0,
      });
      setStudents([]);
      if (error.response?.status !== 400) {
        alert('Không thể tải báo cáo: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportFile = async () => {
    if (!selectedYear || !selectedSemester) {
      alert('Vui lòng chọn năm học và học kì');
      return;
    }

    try {
      const params = new URLSearchParams({
        school_year: selectedYear,
        semester: selectedSemester === '1' ? 'HK1' : selectedSemester === '2' ? 'HK2' : 'HK3',
        format: 'excel',
      });

      if (selectedSubject) {
        params.append('course_id', selectedSubject);
      }

      // Create CSV content
      const csvContent = [
        ['STT', 'Họ và tên', 'MSVV', 'Tổng số buổi', 'Tỉ lệ chuyên cần'],
        ...students.map((student, index) => [
          index + 1,
          student.full_name,
          student.student_code,
          student.total_sessions,
          student.attendance_rate,
        ]),
      ]
        .map(row => row.join(','))
        .join('\n');

      // Add BOM for UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `BaoCaoDiemDanh_${selectedYear}_${selectedSemester === '1' ? 'HK1' : 'HK2'}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Xuất file thành công!');
    } catch (error) {
      console.error('Export file error:', error);
      alert('Xuất file thất bại');
    }
  };

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Năm Học</option>
          {academicYears.map(year => (
            <option key={year.value} value={year.value}>
              {year.label}
            </option>
          ))}
        </select>

        <select
          value={selectedSemester}
          onChange={e => setSelectedSemester(e.target.value)}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Học Kì</option>
          {semesters.map(semester => (
            <option key={semester.value} value={semester.displayValue}>
              {semester.label}
            </option>
          ))}
        </select>

        <select
          value={selectedSubject}
          onChange={e => setSelectedSubject(e.target.value)}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Môn Học (Tất cả)</option>
          {courses.map(course => (
            <option key={course.course_id} value={course.course_id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendance Overview Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Tổng Quan Điểm Danh</h3>
          {attendanceData.totalRecords > 0 ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-64 h-64">
                  {/* Donut Chart */}
                  <svg className="transform -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="40"
                    />
                    {/* On Time (Red) */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="40"
                      strokeDasharray={`${(attendanceData.onTime / 100) * 502.4} 502.4`}
                    />
                    {/* Late (Blue) */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="40"
                      strokeDasharray={`${(attendanceData.late / 100) * 502.4} 502.4`}
                      strokeDashoffset={`-${(attendanceData.onTime / 100) * 502.4}`}
                    />
                    {/* Absent (Yellow) */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="40"
                      strokeDasharray={`${(attendanceData.absent / 100) * 502.4} 502.4`}
                      strokeDashoffset={`-${((attendanceData.onTime + attendanceData.late) / 100) * 502.4}`}
                    />
                    <text
                      x="100"
                      y="105"
                      textAnchor="middle"
                      className="text-4xl font-bold fill-gray-800"
                      transform="rotate(90 100 100)"
                    >
                      {attendanceData.onTime + attendanceData.late}%
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
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Đúng giờ</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{attendanceData.onTime}%</div>
                    <div className="text-xs text-gray-600">{attendanceData.onTimeCount} lượt</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Muộn</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{attendanceData.late}%</div>
                    <div className="text-xs text-gray-600">{attendanceData.lateCount} lượt</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium">Vắng</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">{attendanceData.absent}%</div>
                    <div className="text-xs text-gray-600">{attendanceData.absentCount} lượt</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    Thống kê hợp lệ/không hợp lệ:
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-emerald-500 rounded-full"></div>
                        <span className="font-medium">Hợp lệ</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600">{attendanceData.valid}%</div>
                        <div className="text-xs text-gray-600">
                          {attendanceData.validCount} lượt
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-orange-500 rounded-full"></div>
                        <span className="font-medium">Không hợp lệ</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-orange-600">{attendanceData.invalid}%</div>
                        <div className="text-xs text-gray-600">
                          {attendanceData.invalidCount} lượt
                        </div>
                      </div>
                    </div>
                    {attendanceData.pendingCount > 0 && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-gray-500 rounded-full"></div>
                          <span className="font-medium">Chờ đánh giá</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-600">{attendanceData.pending}%</div>
                          <div className="text-xs text-gray-600">
                            {attendanceData.pendingCount} lượt
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Tổng số bản ghi:</span>
                    <span className="font-bold text-gray-900">{attendanceData.totalRecords}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Chưa có dữ liệu điểm danh</p>
            </div>
          )}
        </div>

        {/* Student Attendance Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Danh Sách Sinh Viên</h3>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {selectedYear && selectedSemester
                  ? 'Không có dữ liệu'
                  : 'Vui lòng chọn năm học và học kì để xem báo cáo'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4">STT</th>
                    <th className="text-left py-2 px-4">Họ và tên</th>
                    <th className="text-left py-2 px-4">MSVV</th>
                    <th className="text-left py-2 px-4">Tổng số buổi</th>
                    <th className="text-left py-2 px-4">Tỉ lệ chuyên cần</th>
                    <th className="text-left py-2 px-4">Tỉ lệ hợp lệ</th>
                    <th className="text-left py-2 px-4">Tỉ lệ không hợp lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr
                      key={student.student_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-4">{index + 1}</td>
                      <td className="py-2 px-4">{student.full_name}</td>
                      <td className="py-2 px-4">{student.student_code}</td>
                      <td className="py-2 px-4">{student.total_sessions}</td>
                      <td className="py-2 px-4">
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
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-semibold">
                            {student.valid_count || 0}
                          </span>
                          {parseFloat(student.valid_rate || '0') === 100 && (
                            <span className="text-xs text-emerald-600 font-medium">(100%)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600 font-semibold">
                            {student.invalid_count || 0}
                          </span>
                          {parseFloat(student.invalid_rate || '0') === 100 && (
                            <span className="text-xs text-orange-600 font-medium">(100%)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => setShowDetailModal(true)}
          disabled={!selectedYear || !selectedSemester || students.length === 0}
          className={`px-6 py-3 rounded-lg transition font-semibold ${
            !selectedYear || !selectedSemester || students.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Xem chi tiết
        </button>
        <button
          onClick={handleExportFile}
          disabled={!selectedYear || !selectedSemester || students.length === 0}
          className={`px-6 py-3 rounded-lg transition font-semibold ${
            !selectedYear || !selectedSemester || students.length === 0
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-800 text-white hover:bg-blue-900'
          }`}
        >
          Xuất file
        </button>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold">Chi Tiết Báo Cáo Điểm Danh</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Đúng giờ</p>
                  <p className="text-2xl font-bold text-red-600">{attendanceData.onTime}%</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Muộn</p>
                  <p className="text-2xl font-bold text-blue-600">{attendanceData.late}%</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Vắng</p>
                  <p className="text-2xl font-bold text-yellow-600">{attendanceData.absent}%</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Năm học:</strong> {selectedYear}
                </p>
                <p>
                  <strong>Học kì:</strong>{' '}
                  {selectedSemester === '1'
                    ? 'Học kì 1'
                    : selectedSemester === '2'
                      ? 'Học kì 2'
                      : 'Học kì 3'}
                </p>
                {selectedSubject && (
                  <p>
                    <strong>Môn học:</strong>{' '}
                    {courses.find(c => c.course_id.toString() === selectedSubject)?.name ||
                      selectedSubject}
                  </p>
                )}
                <p>
                  <strong>Tổng số sinh viên:</strong> {students.length}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4">STT</th>
                    <th className="text-left py-3 px-4">Họ và tên</th>
                    <th className="text-left py-3 px-4">MSVV</th>
                    <th className="text-left py-3 px-4">Tổng số buổi</th>
                    <th className="text-left py-3 px-4">Tỉ lệ chuyên cần</th>
                    <th className="text-left py-3 px-4">Tỉ lệ hợp lệ</th>
                    <th className="text-left py-3 px-4">Tỉ lệ không hợp lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr
                      key={student.student_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{student.full_name}</td>
                      <td className="py-3 px-4">{student.student_code}</td>
                      <td className="py-3 px-4">{student.total_sessions}</td>
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
                            <span className="text-xs text-emerald-600 font-medium">(100%)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600 font-semibold">
                            {student.invalid_count || 0}
                          </span>
                          {parseFloat(student.invalid_rate || '0') === 100 && (
                            <span className="text-xs text-orange-600 font-medium">(100%)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneralReport;
