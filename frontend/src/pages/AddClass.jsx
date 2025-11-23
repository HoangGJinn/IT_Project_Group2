import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AddClass() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    subjectName: '',
    classCode: '',
    duration: '',
    totalPeriods: '',
    periodsPerSession: '',
    maxStudents: '',
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Xử lý thêm lớp học
    navigate('/classes')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Thêm Lớp Học Mới</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        {/* Image Upload Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-48 h-48 bg-blue-50 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-300">
              <span className="text-6xl text-gray-400">+</span>
            </div>
            <p className="text-gray-600">Thêm hình ảnh minh họa lớp học</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <input
              type="text"
              name="subjectName"
              placeholder="Tên môn học v"
              value={formData.subjectName}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="text"
              name="classCode"
              placeholder="Mã lớp v"
              value={formData.classCode}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="text"
              name="duration"
              placeholder="Thời gian diễn ra v"
              value={formData.duration}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="number"
              name="totalPeriods"
              placeholder="Số tiết v"
              value={formData.totalPeriods}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="number"
              name="periodsPerSession"
              placeholder="Số tiết mỗi buổi v"
              value={formData.periodsPerSession}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="number"
              name="maxStudents"
              placeholder="Số SV tối đa v"
              value={formData.maxStudents}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="px-12 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
          >
            Thêm
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddClass


