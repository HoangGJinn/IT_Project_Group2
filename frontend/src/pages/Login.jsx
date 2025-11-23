import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaUser, FaLock } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import api from '../utils/api'
import { setAuthToken, setUser, isAuthenticated, getUser } from '../utils/auth'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleGoogleSignIn = useCallback(async (response) => {
    try {
      setLoading(true)
      const result = await api.post('/auth/google', {
        id_token: response.credential
      })

      if (result.data.success) {
        setAuthToken(result.data.token)
        setUser(result.data.user)
        
        // Redirect based on role
        if (result.data.user.roles.includes('TEACHER') || result.data.user.roles.includes('ADMIN')) {
          navigate('/classes')
        } else if (result.data.user.roles.includes('STUDENT')) {
          navigate('/student/classes')
        } else {
          navigate('/')
        }
      }
    } catch (error) {
      console.error('Google login error:', error)
      setError(error.response?.data?.message || 'Đăng nhập Google thất bại')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      const user = getUser()
      if (user?.roles?.includes('TEACHER') || user?.roles?.includes('ADMIN')) {
        navigate('/classes', { replace: true })
      } else if (user?.roles?.includes('STUDENT')) {
        navigate('/student/classes', { replace: true })
      }
    }
  }, [navigate])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID chưa được cấu hình')
      return
    }

    const initializeGoogleSignIn = (clientId) => {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSignIn,
        })
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error)
      }
    }

    const renderGoogleButton = () => {
      const buttonContainer = document.getElementById('google-signin-button')
      if (buttonContainer && window.google && window.google.accounts) {
        // Clear container first
        buttonContainer.innerHTML = ''
        
        try {
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            width: buttonContainer.offsetWidth || 400,
            text: 'signin_with',
            locale: 'vi',
          })
        } catch (error) {
          console.error('Error rendering Google button:', error)
        }
      }
    }

    // Check if script already exists
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      // Script already loaded, just initialize
      if (window.google && window.google.accounts) {
        initializeGoogleSignIn(clientId)
        // Delay render to ensure DOM is ready
        setTimeout(renderGoogleButton, 100)
      }
      return
    }

    // Load Google Sign-In script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      if (window.google && window.google.accounts) {
        initializeGoogleSignIn(clientId)
        // Delay render to ensure DOM is ready
        setTimeout(renderGoogleButton, 100)
      } else {
        console.error('Google Sign-In script không load được')
      }
    }

    script.onerror = () => {
      console.error('Lỗi khi load Google Sign-In script')
      setError('Không thể load Google Sign-In. Vui lòng kiểm tra kết nối mạng.')
    }

    document.body.appendChild(script)

    return () => {
      // Cleanup - không xóa script vì có thể được dùng ở nơi khác
    }
  }, [handleGoogleSignIn])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const result = await api.post('/auth/login', {
        email: email,
        password: password
      })

      if (result.data.success) {
        setAuthToken(result.data.token)
        setUser(result.data.user)
        
        // Redirect based on role
        if (result.data.user.roles.includes('TEACHER') || result.data.user.roles.includes('ADMIN')) {
          navigate('/classes')
        } else if (result.data.user.roles.includes('STUDENT')) {
          navigate('/student/classes')
        } else {
          navigate('/')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md border-2 border-purple-500">
        <h1 className="text-3xl font-bold text-center mb-8 text-black">
          ĐĂNG NHẬP
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        {/* Google Login Button */}
        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div className="mt-4">
            <div 
              id="google-signin-button" 
              className="w-full flex justify-center"
              style={{ minHeight: '40px' }}
            ></div>
          </div>
        ) : (
          <div className="mt-4 text-center text-sm text-gray-500">
            Google Sign-In chưa được cấu hình
          </div>
        )}

        {/* Forgot Password Link */}
        <div className="mt-6 text-center">
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login


