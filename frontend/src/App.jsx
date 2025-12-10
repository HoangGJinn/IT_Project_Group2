import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ClassManagement from './pages/ClassManagement';
import ClassDetail from './pages/ClassDetail';
import AddClass from './pages/AddClass';
import TeachingSchedule from './pages/TeachingSchedule';
import GeneralReport from './pages/GeneralReport';
import AccountInfo from './pages/AccountInfo';
import StudentManagement from './pages/StudentManagement';
import TeacherManagement from './pages/TeacherManagement';
// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentClasses from './pages/student/StudentClasses';
import StudentClassDetail from './pages/student/StudentClassDetail';
import ScanQR from './pages/student/ScanQR';
import AttendanceHistory from './pages/student/AttendanceHistory';
import StudentAccount from './pages/student/StudentAccount';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Teacher Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/classes" replace />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="classes/add" element={<AddClass />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="schedule" element={<TeachingSchedule />} />
          <Route path="report" element={<GeneralReport />} />
          <Route path="account" element={<AccountInfo />} />
          <Route path="/admin/students" element={<StudentManagement />} />
          <Route path="/admin/teachers" element={<TeacherManagement />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/classes" replace />} />
          <Route path="classes" element={<StudentClasses />} />
          <Route path="classes/:id" element={<StudentClassDetail />} />
          <Route path="scan" element={<ScanQR />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="account" element={<StudentAccount />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
