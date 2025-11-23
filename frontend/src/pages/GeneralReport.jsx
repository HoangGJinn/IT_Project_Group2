import { useState } from 'react'

function GeneralReport() {
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')

  // Mock data - sẽ thay bằng API call sau
  const attendanceData = {
    onTime: 85,
    late: 10,
    absent: 5,
  }

  const students = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      studentId: '23110987',
      totalSessions: '45/45',
      attendanceRate: '100%',
    },
  ]

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Năm Học</option>
          <option value="2023-2024">2023-2024</option>
          <option value="2024-2025">2024-2025</option>
        </select>

        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Học Kì</option>
          <option value="1">Học Kì 1</option>
          <option value="2">Học Kì 2</option>
        </select>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Môn Học</option>
          <option value="web">Lập Trình Web</option>
          <option value="db">Cơ Sở Dữ Liệu</option>
        </select>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Attendance Overview Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Tổng Quan Điểm Danh</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Donut Chart - Simplified version */}
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
                  stroke="#ef4444"
                  strokeWidth="40"
                  strokeDasharray={`${(attendanceData.onTime / 100) * 502.4} 502.4`}
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="40"
                  strokeDasharray={`${(attendanceData.absent / 100) * 502.4} 502.4`}
                  strokeDashoffset={`-${(attendanceData.onTime / 100) * 502.4}`}
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="40"
                  strokeDasharray={`${(attendanceData.late / 100) * 502.4} 502.4`}
                  strokeDashoffset={`-${((attendanceData.onTime + attendanceData.absent) / 100) * 502.4}`}
                />
                <text
                  x="100"
                  y="110"
                  textAnchor="middle"
                  className="text-3xl font-bold fill-gray-800"
                >
                  {attendanceData.onTime}%
                </text>
              </svg>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span>Đúng giờ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Muộn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span>Vắng</span>
            </div>
          </div>
        </div>

        {/* Student Attendance Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Danh Sách Sinh Viên</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4">STT</th>
                  <th className="text-left py-2 px-4">Họ và tên</th>
                  <th className="text-left py-2 px-4">MSVV</th>
                  <th className="text-left py-2 px-4">Tổng số buổi</th>
                  <th className="text-left py-2 px-4">Tỉ lệ chuyên cần</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} className="border-b border-gray-100">
                    <td className="py-2 px-4">{index + 1}</td>
                    <td className="py-2 px-4">{student.name}</td>
                    <td className="py-2 px-4">{student.studentId}</td>
                    <td className="py-2 px-4">{student.totalSessions}</td>
                    <td className="py-2 px-4">{student.attendanceRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
          Xem chi tiết
        </button>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
          Xuất file
        </button>
      </div>
    </div>
  )
}

export default GeneralReport


