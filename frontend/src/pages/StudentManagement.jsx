//Diễm Ngọc------------------------------------------------------
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { FiSearch } from 'react-icons/fi';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');

  // Modal Thêm
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    student_code: '',
    class_cohort: '',
  });

  // Modal Sửa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState({
    user_id: '',
    full_name: '',
    email: '',
    phone: '',
    status: '',
    student_code: '',
    class_cohort: '',
  });

  // Modal Chi Tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [studentDetail, setStudentDetail] = useState(null);

  // Load danh sách sinh viên
  const fetchStudents = () => {
    api
      .get('/admin/students')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setStudents(list);
      })
      .catch(err => {
        console.error('GET /api/students error:', err);
        setStudents([]);
      });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter
  const filtered = (Array.isArray(students) ? students : []).filter(s => {
    const code = (s.student_code || '').toLowerCase();
    const cohort = (s.class_cohort || '').toLowerCase();
    const term = search.toLowerCase();
    return code.includes(term) || cohort.includes(term);
  });

  // Input handler
  const handleInput = e => {
    setNewStudent({ ...newStudent, [e.target.name]: e.target.value });
  };

  // Thêm sinh viên
  // Thêm sinh viên
  const handleAddStudent = async () => {
    try {
      await api.post('/users/create-full', {
        full_name: newStudent.full_name,
        email: newStudent.email,
        phone: newStudent.phone,
        password: newStudent.password || '123456',
        student_code: newStudent.student_code,
        class_cohort: newStudent.class_cohort,
      });

      alert('Thêm sinh viên thành công!');
      setShowAddModal(false);

      // reset form
      setNewStudent({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        student_code: '',
        class_cohort: '',
      });

      fetchStudents();
    } catch (error) {
      const msg =
        error.response?.data?.message || error.response?.data?.error || 'Không thể thêm sinh viên!';
      alert(msg);
    }
  };

  // Mở modal sửa
  const openEditModal = async student => {
    const userRes = await api.get(`/users/${student.user_id}`);

    const user = userRes.data;

    setEditStudent({
      user_id: student.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      student_code: student.student_code,
      class_cohort: student.class_cohort,
    });

    setShowEditModal(true);
  };

  // Lưu chỉnh sửa
  const handleUpdateStudent = async () => {
    try {
      // 1️⃣ Update USER
      await api.put(`/users/${editStudent.user_id}`, {
        full_name: editStudent.full_name,
        email: editStudent.email,
        phone: editStudent.phone,
        status: editStudent.status,
      });

      // 2️⃣ Update STUDENT
      await api.put(`/admin/students/${editStudent.user_id}`, {
        student_code: editStudent.student_code,
        class_cohort: editStudent.class_cohort,
      });

      alert('Cập nhật thành công!');
      setShowEditModal(false);
      fetchStudents();
    } catch (error) {
      console.error('🔥 UPDATE ERROR:', error.response?.data || error);
      alert(error.response?.data?.message || 'Không thể cập nhật!');
    }
  };
  // Mở modal chi tiết
  const openDetails = async student => {
    const res = await api.get(`/admin/students/detail/${student.student_id}`);

    setStudentDetail(res.data);
    setShowDetailModal(true);
  };

  const resetPassword = async student => {
    if (!window.confirm('Đặt lại mật khẩu sinh viên này về 123456?')) return;

    try {
      await api.put(`/users/${student.user_id}/reset-password`);

      alert('Đã đặt lại mật khẩu về 123456!');
    } catch (error) {
      console.error('🔥 RESET PASSWORD ERROR:', error.response?.data || error);
      alert(error.response?.data?.message || 'Không thể reset mật khẩu!');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-xl font-semibold mb-6">Quản Lý Sinh Viên</div>

      {/* Filter + Search */}
      <div className="flex items-center gap-4 mb-6">
        <button className="px-4 py-2 bg-blue-50 rounded-lg text-gray-700 border">Tất cả lớp</button>

        <button className="px-4 py-2 bg-blue-50 rounded-lg text-gray-700 border">
          Tất cả khóa
        </button>

        {/* Search bar */}
        <div className="flex items-center bg-white px-4 py-2 rounded-lg border w-72 shadow-sm">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            className="outline-none flex-1"
            placeholder="Tìm kiếm sinh viên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List Students */}
      <div className="grid grid-cols-2 gap-6">
        {filtered.map(student => (
          <div
            key={student.student_id}
            className="flex p-4 bg-blue-50 rounded-xl shadow hover:shadow-md transition relative"
          >
            {/* Avatar */}
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 mr-4">
              Hình ảnh
            </div>

            {/* Info */}
            <div>
              <p>
                <b>User ID:</b> {student.user_id}
              </p>
              <p>
                <b>MSSV:</b> {student.student_code}
              </p>
              <p>
                <b>Tên:</b> {student.user?.full_name}
              </p>
              <p>
                <b>Lớp:</b> {student.class_cohort}
              </p>
            </div>

            {/* Nút chi tiết */}
            <button
              onClick={() => openDetails(student)}
              className="absolute top-3 right-20 text-blue-500 hover:text-blue-700"
            >
              Chi tiết
            </button>

            {/* Nút sửa */}
            <button
              onClick={() => openEditModal(student)}
              className="absolute top-3 right-10 text-blue-500 hover:text-blue-700"
            >
              Sửa
            </button>

            {/* Reset Password */}
            <button
              onClick={() => resetPassword(student)}
              className="absolute top-3 right-36 text-orange-500 hover:text-orange-700"
            >
              Reset MK
            </button>
          </div>
        ))}
      </div>

      {/* Nút thêm sinh viên */}
      <div className="flex justify-end mt-6">
        <button
          className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          onClick={() => setShowAddModal(true)}
        >
          Thêm Sinh Viên
        </button>
      </div>

      {/* ---------------------- MODAL THÊM ----------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Thêm Sinh Viên</h2>

            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                name="full_name"
                placeholder="Họ và tên"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="text"
                name="phone"
                placeholder="Điện thoại"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="password"
                name="password"
                placeholder="Mật khẩu đăng nhập"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="text"
                name="student_code"
                placeholder="Mã sinh viên"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="text"
                name="class_cohort"
                placeholder="Lớp khóa"
                className="border p-2 rounded"
                onChange={handleInput}
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- MODAL SỬA ----------------------- */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Sửa Sinh Viên</h2>

            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                value={editStudent.full_name}
                className="border p-2 rounded"
                onChange={e => setEditStudent({ ...editStudent, full_name: e.target.value })}
              />

              <input
                type="email"
                value={editStudent.email}
                className="border p-2 rounded"
                onChange={e => setEditStudent({ ...editStudent, email: e.target.value })}
              />

              <input
                type="text"
                value={editStudent.phone}
                className="border p-2 rounded"
                onChange={e => setEditStudent({ ...editStudent, phone: e.target.value })}
              />

              <input
                type="text"
                value={editStudent.status}
                className="border p-2 rounded"
                onChange={e => setEditStudent({ ...editStudent, status: e.target.value })}
              />

              <input
                type="text"
                value={editStudent.student_code}
                className="border p-2 rounded"
                onChange={e => setEditStudent({ ...editStudent, student_code: e.target.value })}
              />

              <input
                type="text"
                value={editStudent.class_cohort}
                className="border p-2 rounded"
                onChange={e => setEditStudent({ ...editStudent, class_cohort: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateStudent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết */}
      {showDetailModal && studentDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Thông Tin Sinh Viên</h2>

            {/* Nội dung thông tin */}
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <span className="font-semibold">User ID:</span> {studentDetail?.user?.user_id}
              </p>
              <p>
                <span className="font-semibold">Student ID:</span> {studentDetail?.student_id}
              </p>
              <p>
                <span className="font-semibold">Mã SV:</span> {studentDetail?.student_code}
              </p>

              <p>
                <span className="font-semibold">Họ tên:</span> {studentDetail?.user?.full_name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {studentDetail?.user?.email}
              </p>
              <p>
                <span className="font-semibold">Điện thoại:</span> {studentDetail?.user?.phone}
              </p>
              <p>
                <span className="font-semibold">Trạng thái:</span> {studentDetail?.user?.status}
              </p>

              <p>
                <span className="font-semibold">Ngày tạo:</span>{' '}
                {new Date(studentDetail?.user?.created_at).toLocaleString('vi-VN')}
              </p>

              <p>
                <span className="font-semibold">Ngày cập nhật:</span>{' '}
                {new Date(studentDetail?.user?.updated_at).toLocaleString('vi-VN')}
              </p>

              <p>
                <span className="font-semibold">Khoá:</span> {studentDetail?.class_cohort}
              </p>
            </div>

            {/* Nút đóng */}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
//--------------------------------------------------------------Diễm Ngọc
