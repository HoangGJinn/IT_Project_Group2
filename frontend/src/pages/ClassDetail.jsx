import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'

function ClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('students')
  const [qrCloseTime, setQrCloseTime] = useState('')
  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClassDetail()
    if (activeTab === 'students') {
      fetchStudents()
    } else if (activeTab === 'history') {
      fetchSessions()
    }
  }, [id, activeTab])

  const fetchClassDetail = async () => {
    try {
      const response = await api.get(`/classes/${id}`)
      if (response.data.success) {
        setClassInfo(response.data.data)
      }
    } catch (error) {
      console.error('Fetch class detail error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await api.get(`/classes/${id}/students`)
      if (response.data.success) {
        setStudents(response.data.data || [])
      }
    } catch (error) {
      console.error('Fetch students error:', error)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await api.get(`/sessions/classes/${id}`)
      if (response.data.success) {
        setSessions(response.data.data || [])
      }
    } catch (error) {
      console.error('Fetch sessions error:', error)
    }
  }

  const handleCreateQR = async () => {
    if (!qrCloseTime) {
      alert('Vui lòng chọn thời gian đóng QR')
      return
    }
    try {
      // Find current session or create one
      const today = new Date().toISOString().split('T')[0]
      const currentSession = sessions.find(s => s.date === today && s.status === 'ONGOING')
      
      if (!currentSession) {
        alert('Không có buổi học đang diễn ra')
        return
      }

      const response = await api.post(`/sessions/${currentSession.session_id}/attendance/start`, {
        method: 'QR',
        duration_minutes: parseInt(qrCloseTime)
      })

      if (response.data.success) {
        alert(`QR code đã được tạo! Token: ${response.data.data.qr_token}`)
      }
    } catch (error) {
      console.error('Create QR error:', error)
      alert(error.response?.data?.message || 'Tạo QR code thất bại')
    }
  }

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
        <div className="flex gap-4">
          <select
            value={qrCloseTime}
            onChange={(e) => setQrCloseTime(e.target.value)}
            className="px-4 py-2 bg-gray-200 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Thời Gian Đóng QR v</option>
            <option value="5">5 phút</option>
            <option value="10">10 phút</option>
            <option value="15">15 phút</option>
          </select>
          <button 
            onClick={handleCreateQR}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Tạo QR Điểm Danh
          </button>
        </div>
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
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Lịch Sử Buổi Học
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
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4">STT</th>
                  <th className="text-left py-3 px-4">Họ và tên</th>
                  <th className="text-left py-3 px-4">MSVV</th>
                  <th className="text-left py-3 px-4">Tổng số buổi</th>
                  <th className="text-left py-3 px-4">Tỉ lệ chuyên cần</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      Chưa có sinh viên nào
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => (
                    <tr key={student.student_id} className="border-b border-gray-100">
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">{student.full_name}</td>
                      <td className="py-3 px-4">{student.student_code}</td>
                      <td className="py-3 px-4">{student.total_sessions || 0}</td>
                      <td className="py-3 px-4">{student.attendance_rate || '0%'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              Thêm
            </button>
            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
              Xoá
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Chưa có buổi học nào</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div key={session.session_id} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Buổi {index + 1}</h3>
                <div className="mb-4">
                  {session.room && <p className="text-gray-700">Phòng: {session.room}</p>}
                  <p className="text-gray-700">
                    Ngày: {new Date(session.date).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-gray-700">
                    Thời gian: {session.start_time} {session.end_time ? `- ${session.end_time}` : ''}
                  </p>
                  {session.topic && <p className="text-gray-700">Chủ đề: {session.topic}</p>}
                </div>
                <button
                  onClick={() => {
                    // Navigate to attendance list
                    const attendanceSessionId = session.attendanceSession?.attendance_session_id
                    if (attendanceSessionId) {
                      // Show attendance modal or navigate
                      alert('Xem danh sách điểm danh')
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 underline mb-4 block"
                >
                  Xem DS Điểm danh
                </button>
                <div className="flex gap-4 flex-wrap">
                  {session.materials && session.materials.length > 0 ? (
                    session.materials.map((material, idx) => (
                      <div
                        key={material.material_id}
                        className={`bg-blue-50 rounded-lg p-4 min-w-[150px] text-center cursor-pointer hover:bg-blue-100 ${
                          idx === 0 ? 'border-2 border-purple-500' : ''
                        }`}
                        onClick={() => window.open(material.file_url, '_blank')}
                      >
                        {material.name}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Chưa có tài liệu</p>
                  )}
                  <button className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
                    <span className="text-2xl">+</span>
                    <span>Thêm Tài liệu</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Upload */}
            <div>
              <div className="w-full h-64 bg-blue-50 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-blue-300">
                <div className="text-center">
                  <span className="text-6xl text-gray-400">+</span>
                  <p className="text-gray-600 mt-2">Thêm hình ảnh minh họa lớp học</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Tên môn học v"
                    className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Mã lớp v"
                    className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Số tiết v"
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Thời gian diễn ra v"
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Số tiết mỗi buổi v"
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Số SV tối đa v"
                  className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <button className="px-12 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              Lưu
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default ClassDetail


