import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

function ClassManagement() {
  const navigate = useNavigate()
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClasses()
  }, [selectedYear, selectedSemester])

  const fetchClasses = async () => {
    try {
      setLoading(true)
      const params = {}
      if (selectedYear) params.school_year = selectedYear
      if (selectedSemester) params.semester = selectedSemester
      if (searchTerm) params.search = searchTerm

      const response = await api.get('/classes', { params })
      if (response.data.success) {
        setClasses(response.data.data || [])
      }
    } catch (error) {
      console.error('Fetch classes error:', error)
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchClasses()
  }

  const handleDeleteClass = async (classId, classCode, e) => {
    e.stopPropagation(); // Prevent navigation when clicking delete button
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa lớp học "${classCode}"?\n\nHành động này không thể hoàn tác. Tất cả dữ liệu liên quan (buổi học, điểm danh, sinh viên) sẽ bị xóa.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.delete(`/classes/${classId}`);
      alert('Xóa lớp học thành công!');
      fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Delete class error:', error);
      alert(error.response?.data?.message || 'Xóa lớp học thất bại. Vui lòng thử lại.');
    }
  }

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tất cả năm học</option>
          <option value="2023-2024">2023-2024</option>
          <option value="2024-2025">2024-2025</option>
        </select>

        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Tất cả học kì</option>
          <option value="1">Học Kì 1</option>
          <option value="2">Học Kì 2</option>
        </select>

        <button 
          onClick={handleFilter}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          LỌC
        </button>

        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {classes.map((classItem) => (
            <div
              key={classItem.class_id}
              className="bg-blue-50 rounded-lg p-6 shadow-md hover:shadow-lg transition relative"
            >
              <div 
                className="cursor-pointer"
                onClick={() => navigate(`/classes/${classItem.class_id}`)}
              >
                <div className="flex gap-4">
                  {/* Image */}
                  {classItem.image_url ? (
                    <img
                      src={classItem.image_url}
                      alt={classItem.name || classItem.course?.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                      Hình ảnh
                    </div>
                  )}

                  {/* Class Info */}
                  <div className="flex-1">
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Môn:</span> {classItem.name || classItem.course?.name || 'N/A'}
                    </p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Mã lớp:</span> {classItem.class_code}
                    </p>
                    <p className="text-gray-700 mb-1">
                      <span className="font-semibold">Năm học:</span> {classItem.school_year}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Học kì:</span> {classItem.semester}
                    </p>
                    {classItem.schedule_days && (
                      <p className="text-gray-700 text-sm mt-1">
                        <span className="font-semibold">Lịch:</span> {classItem.schedule_days} - {classItem.schedule_periods}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteClass(classItem.class_id, classItem.class_code, e)}
                className="absolute top-2 right-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Xóa lớp học"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Class Button */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate('/classes/add')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Thêm Lớp Học
        </button>
      </div>
    </div>
  )
}

export default ClassManagement


