import { Navigate } from 'react-router-dom'
import { isAuthenticated, getUser } from '../utils/auth'

function ProtectedRoute({ children, allowedRoles = [] }) {
  const authenticated = isAuthenticated()
  const user = getUser()

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role if specified
  if (allowedRoles.length > 0 && user) {
    const hasRole = user.roles?.some(role => allowedRoles.includes(role))
    if (!hasRole) {
      // Redirect based on user role
      if (user.roles?.includes('STUDENT')) {
        return <Navigate to="/student/classes" replace />
      } else if (user.roles?.includes('TEACHER') || user.roles?.includes('ADMIN')) {
        return <Navigate to="/classes" replace />
      }
      return <Navigate to="/login" replace />
    }
  }

  return children
}

export default ProtectedRoute

