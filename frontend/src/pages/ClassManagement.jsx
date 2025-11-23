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

  return (
    <div>
      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Năm Học v</option>
          <option value="2023-2024">2023-2024</option>
          <option value="2024-2025">2024-2025</option>
        </select>

        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Học Kì v</option>
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
              className="bg-blue-50 rounded-lg p-6 shadow-md hover:shadow-lg transition cursor-pointer"
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


