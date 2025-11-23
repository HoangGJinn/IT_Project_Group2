import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { FaUser, FaCalendar, FaClock, FaMapMarkerAlt, FaChartLine } from 'react-icons/fa'

function StudentClassDetail() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('info')

  // Mock data - sẽ thay bằng API call sau
  const classInfo = {
    id: id,
    name: 'Lập Trình Web',
    code: 'WEB001',
    teacher: 'Nguyễn Văn A',
    day: 'Thứ 2, Thứ 5',
    period: '7->10',
    room: 'A112',
    totalSessions: 45,
    attendedSessions: 43,
    attendanceRate: '95.6%',
  }

  const sessions = [
    {
      id: 1,
      session: 'Buổi 15',
      date: '2024-11-20',
      status: 'attended',
      topic: 'React Hooks và State Management',
    },
    {
      id: 2,
      session: 'Buổi 14',
      date: '2024-11-18',
      status: 'attended',
      topic: 'React Components',
    },
    {
      id: 3,
      session: 'Buổi 13',
      date: '2024-11-15',
      status: 'attended',
      topic: 'JavaScript ES6+',
    },
    {
      id: 4,
      session: 'Buổi 12',
      date: '2024-11-13',
      status: 'absent',
      topic: 'DOM Manipulation',
    },
  ]

  const materials = [
    { id: 1, name: 'Bài giảng tuần 1.pdf', type: 'pdf', size: '2.5 MB' },
    { id: 2, name: 'Lab 1 - HTML Basics.docx', type: 'docx', size: '1.2 MB' },
    { id: 3, name: 'Video bài giảng tuần 1.mp4', type: 'video', size: '150 MB' },
  ]

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
                  <p className="text-gray-800">
                    Môn học cung cấp kiến thức về lập trình web hiện đại, bao gồm HTML, CSS, JavaScript và các framework phổ biến.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                session.status === 'attended' ? 'border-green-500' : 'border-red-500'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {session.session}
                  </h3>
                  <p className="text-gray-600 mb-1">
                    <span className="font-semibold">Ngày:</span>{' '}
                    {new Date(session.date).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">Chủ đề:</span> {session.topic}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    session.status === 'attended'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {session.status === 'attended' ? 'Đã tham gia' : 'Vắng mặt'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Tài Liệu Học Tập</h2>
          <div className="space-y-3">
            {materials.map((material) => (
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
  )
}

export default StudentClassDetail

