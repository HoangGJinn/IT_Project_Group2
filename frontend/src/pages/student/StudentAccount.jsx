import { useState, useEffect } from 'react'
import { FaUser } from 'react-icons/fa'
import api from '../../utils/api'
import { getUser } from '../../utils/auth'

function StudentAccount() {
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/profile')
      if (response.data.success) {
        const data = response.data.data
        setEmail(data.user?.email || '')
        setStudentId(data.student_code || '')
        setFullName(data.user?.full_name || '')
        setPhone(data.user?.phone || '')
      }
    } catch (error) {
      console.error('Fetch profile error:', error)
      setError('Không thể tải thông tin tài khoản')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const response = await api.put('/users/profile', {
        full_name: fullName,
        phone: phone || null
      })

      if (response.data.success) {
        setSuccess('Cập nhật thông tin thành công!')
        // Update user in localStorage
        const currentUser = getUser()
        if (currentUser) {
          currentUser.full_name = fullName
          currentUser.phone = phone
          localStorage.setItem('user', JSON.stringify(currentUser))
        }
      }
    } catch (error) {
      console.error('Update profile error:', error)
      setError(error.response?.data?.message || 'Cập nhật thông tin thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp')
      return
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const response = await api.put('/users/change-password', {
        old_password: oldPassword,
        new_password: newPassword
      })

      if (response.data.success) {
        setSuccess('Đổi mật khẩu thành công!')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (error) {
      console.error('Change password error:', error)
      setError(error.response?.data?.message || 'Đổi mật khẩu thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
        THÔNG TIN TÀI KHOẢN
      </h1>

      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="w-48 h-48 rounded-full border-4 border-blue-500 flex items-center justify-center bg-blue-50 mb-4">
              <FaUser className="text-6xl text-blue-500" />
            </div>
            <button className="text-blue-600 font-semibold hover:text-blue-800 transition">
              CẬP NHẬT HÌNH ẢNH
            </button>
          </div>

          {/* Account Details Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã số sinh viên
              </label>
              <input
                type="text"
                value={studentId}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Họ và tên"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Số điện thoại"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Đổi Mật Khẩu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu cũ
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Mật khẩu cũ"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mật khẩu mới"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Xác nhận mật khẩu"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            disabled={saving}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang xử lý...' : 'Đổi Mật Khẩu'}
          </button>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-12 py-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-semibold text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'LƯU THAY ĐỔI'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentAccount

