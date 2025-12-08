// Auth utility functions

export const setAuthToken = token => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const setUser = user => {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const logout = navigate => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Use React Router navigate if provided, otherwise fallback to window.location
  if (navigate) {
    navigate('/login', { replace: true });
  } else {
    // Fallback: redirect to root and let React Router handle it
    window.location.href = window.location.origin + '/login';
  }
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const hasRole = (user, role) => {
  if (!user || !user.roles) return false;
  return user.roles.includes(role);
};
