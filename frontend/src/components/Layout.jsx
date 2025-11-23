import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { FaBell, FaUser, FaBars, FaSignOutAlt } from 'react-icons/fa'
import { useState, useEffect, useRef } from 'react'
import { getUser, logout } from '../utils/auth'

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
  }

  const isActive = (path) => {
    if (path === '/classes') {
      return location.pathname === '/classes' || location.pathname.startsWith('/classes/')
    }
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Navigation Links */}
            <nav className="flex space-x-1">
              <Link
                to="/classes"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive('/classes')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-blue-500 hover:bg-blue-50'
                }`}
              >
                Quản Lý Lớp Học
              </Link>
              <Link
                to="/schedule"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive('/schedule')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-blue-500 hover:bg-blue-50'
                }`}
              >
                Lịch Dạy
              </Link>
              <Link
                to="/report"
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive('/report')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-blue-500 hover:bg-blue-50'
                }`}
              >
                Báo Cáo Tổng Hợp
              </Link>
            </nav>

            {/* User Info */}
            <div className="flex items-center space-x-4">
              <FaBell className="text-gray-600 text-xl cursor-pointer hover:text-blue-600" />
              <div className="relative" ref={dropdownRef}>
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <FaUser className="text-blue-600 text-xl" />
                  <span className="text-gray-700 font-medium">
                    {user?.full_name || 'Giáo Viên'}
                  </span>
                </div>
                
                {/* Dropdown Menu */}
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        navigate('/account')
                        setShowDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition flex items-center gap-2"
                    >
                      <FaUser className="text-gray-500" />
                      <span>Thông tin tài khoản</span>
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                    >
                      <FaSignOutAlt />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
              <FaBars className="text-gray-600 text-xl cursor-pointer hover:text-blue-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout


