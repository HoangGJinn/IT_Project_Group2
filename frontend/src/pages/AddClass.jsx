import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

function AddClass() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])
  
  // Get current year for school_year default
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const defaultSchoolYear = currentMonth >= 9 
    ? `${currentYear}-${currentYear + 1}` 
    : `${currentYear - 1}-${currentYear}`

  const [formData, setFormData] = useState({
    course_id: '',
    class_code: '',
    name: '',
    semester: '',
    school_year: defaultSchoolYear, // Initialize with default value
    capacity: '',
    planned_sessions: '',
    schedule_days: '',
    schedule_periods: '',
    image_url: '',
  })

  useEffect(() => {
    // Load courses list
    const loadCourses = async () => {
      try {
        const response = await api.get('/courses')
        if (response.data.success) {
          setCourses(response.data.data)
        }
      } catch (err) {
        console.error('Error loading courses:', err)
        setError('Không thể tải danh sách môn học')
      }
    }
    loadCourses()
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields
      const trimmedClassCode = formData.class_code.trim()
      const trimmedSchoolYear = formData.school_year.trim()
      
      if (!formData.course_id || !trimmedClassCode || !formData.semester || !trimmedSchoolYear) {
        setError('Vui lòng điền đầy đủ các trường bắt buộc')
        setLoading(false)
        return
      }

      // Prepare data for API
      const submitData = {
        course_id: parseInt(formData.course_id),
        class_code: formData.class_code.trim(),
        name: formData.name.trim() || null,
        semester: formData.semester,
        school_year: formData.school_year,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        planned_sessions: formData.planned_sessions ? parseInt(formData.planned_sessions) : null,
        schedule_days: formData.schedule_days.trim() || null,
        schedule_periods: formData.schedule_periods.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        image_url: formData.image_url.trim() || null,
      }

      const response = await api.post('/classes', submitData)
      
      if (response.data.success) {
        alert('Thêm lớp học thành công!')
        navigate('/classes')
      } else {
        setError(response.data.message || 'Thêm lớp học thất bại. Vui lòng thử lại.')
      }
    } catch (err) {
      console.error('Create class error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Thêm lớp học thất bại. Vui lòng thử lại.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Thêm Lớp Học Mới</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Image Upload Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-48 h-48 bg-blue-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-300">
              <span className="text-6xl text-gray-400">+</span>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Thêm hình ảnh minh họa lớp học</p>
              <input
                type="text"
                name="image_url"
                placeholder="URL hình ảnh (tùy chọn)"
                value={formData.image_url}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Môn học <span className="text-red-500">*</span>
            </label>
            <select
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Chọn môn học</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mã lớp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="class_code"
              placeholder="Mã lớp"
              value={formData.class_code}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Class Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên lớp (tùy chọn)
            </label>
            <input
              type="text"
              name="name"
              placeholder="Tên lớp"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Học kỳ <span className="text-red-500">*</span>
            </label>
            <select
              name="semester"
              value={formData.semester}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Chọn học kỳ</option>
              <option value="HK1">Học kỳ 1</option>
              <option value="HK2">Học kỳ 2</option>
              <option value="HK3">Học kỳ 3</option>
            </select>
          </div>

          {/* School Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Năm học <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="school_year"
              placeholder="Năm học (VD: 2024-2025)"
              value={formData.school_year}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số SV tối đa
            </label>
            <input
              type="number"
              name="capacity"
              placeholder="Số SV tối đa"
              value={formData.capacity}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Planned Sessions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số buổi học dự kiến
            </label>
            <input
              type="number"
              name="planned_sessions"
              placeholder="Số buổi học"
              value={formData.planned_sessions}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Schedule Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thứ học <span className="text-gray-500 text-xs">(Tùy chọn - để hiển thị trong lịch dạy)</span>
            </label>
            <input
              type="text"
              name="schedule_days"
              placeholder="VD: 2,4,6 hoặc Thứ 2, Thứ 4, Thứ 6"
              value={formData.schedule_days}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nhập các thứ trong tuần: 2=Thứ 2, 3=Thứ 3, ..., 7=Thứ 7, 0 hoặc CN=Chủ Nhật
            </p>
          </div>

          {/* Schedule Periods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiết học <span className="text-gray-500 text-xs">(Tùy chọn - để hiển thị trong lịch dạy)</span>
            </label>
            <input
              type="text"
              name="schedule_periods"
              placeholder="VD: 7-10 hoặc 1-3"
              value={formData.schedule_periods}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nhập khoảng tiết học: VD "7-10" (từ tiết 7 đến tiết 10) hoặc "1-3"
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày bắt đầu môn học <span className="text-gray-500 text-xs">(Tùy chọn)</span>
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lịch dạy sẽ chỉ hiển thị từ ngày này trở đi
            </p>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày kết thúc môn học <span className="text-gray-500 text-xs">(Tùy chọn)</span>
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lịch dạy sẽ chỉ hiển thị đến ngày này
            </p>
          </div>
        </div>

        {/* Info Box about Schedule */}
        {(formData.schedule_days || formData.schedule_periods) && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">💡 Lưu ý:</span> Sau khi tạo lớp học, lịch dạy sẽ tự động hiển thị trong trang "Lịch Dạy Của Tôi" dựa trên thông tin thứ học và tiết học bạn vừa nhập. 
              Bạn có thể tạo các buổi học cụ thể từ lịch dạy này sau.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/classes')}
            className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-12 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : 'Thêm'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddClass



