import { useEffect, useState } from 'react';
import axios from 'axios';
import { FiSearch, FiTrash2 } from 'react-icons/fi';

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');

  // Modal Thêm
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    teacher_code: '',
    academic_title: '',
  });

  // Modal Sửa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState({
    user_id: '',
    full_name: '',
    email: '',
    phone: '',
    status: '',
    teacher_code: '',
    academic_title: '',
  });

  // Modal Chi Tiết
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [teacherDetail, setTeacherDetail] = useState(null);

  // Load danh sách giáo viên
  const fetchTeachers = () => {
    const token = localStorage.getItem('token');

    axios
      .get('/api/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTeachers(list);
      })
      .catch(err => {
        console.error('GET /api/teachers error:', err);
        setTeachers([]);
      });
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filtered = (Array.isArray(teachers) ? teachers : []).filter(t => {
    const code = (t.teacher_code || '').toLowerCase();
    const title = (t.academic_title || '').toLowerCase();
    const term = search.toLowerCase();
    return code.includes(term) || title.includes(term);
  });

  // Xóa giáo viên
  const deleteTeacher = async teacher => {
    if (!window.confirm('Bạn có chắc muốn xoá giáo viên này?')) return;
    try {
      const token = localStorage.getItem('token');

      await axios.delete(`/api/users/${teacher.user_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert('Xoá giáo viên thành công!');

      setTeachers(prev => prev.filter(x => x.teacher_id !== teacher.teacher_id));
    } catch (error) {
      console.error('🔥 DELETE ERROR:', error.response?.data || error);
      alert(error.response?.data?.message || 'Không thể xoá giáo viên!');
    }
  };

  // Input handler
  const handleInput = e => {
    setNewTeacher({ ...newTeacher, [e.target.name]: e.target.value });
  };

  // Thêm giáo viên
  const handleAddTeacher = async () => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        '/api/users/create-full-teacher',
        {
          full_name: newTeacher.full_name,
          email: newTeacher.email,
          phone: newTeacher.phone,
          password: newTeacher.password || '123456',
          teacher_code: newTeacher.teacher_code,
          academic_title: newTeacher.academic_title,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Thêm giảng viên thành công!');
      setShowAddModal(false);

      setNewTeacher({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        teacher_code: '',
        academic_title: '',
      });

      fetchTeachers();
    } catch (error) {
      console.log('❌ ERROR:', error.response?.data);
      alert(
        error.response?.data?.message || error.response?.data?.error || 'Không thể thêm giảng viên!'
      );
    }
  };

  // Mở modal sửa
  const openEditModal = async teacher => {
    const token = localStorage.getItem('token');

    const userRes = await axios.get(`/api/users/${teacher.user_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = userRes.data;

    setEditTeacher({
      user_id: teacher.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      teacher_code: teacher.teacher_code,
      academic_title: teacher.academic_title,
    });

    setShowEditModal(true);
  };

  // Lưu chỉnh sửa
  const handleUpdateTeacher = async () => {
    try {
      const token = localStorage.getItem('token');

      // Update User
      await axios.put(
        `/api/users/${editTeacher.user_id}`,
        {
          full_name: editTeacher.full_name,
          email: editTeacher.email,
          phone: editTeacher.phone,
          status: editTeacher.status,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update Teacher
      await axios.put(
        `/api/teachers/${editTeacher.user_id}`,
        {
          teacher_code: editTeacher.teacher_code,
          academic_title: editTeacher.academic_title,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Cập nhật thành công!');
      setShowEditModal(false);
      fetchTeachers();
    } catch (error) {
      console.error('🔥 UPDATE ERROR:', error.response?.data || error);
      alert(error.response?.data?.message || 'Không thể cập nhật!');
    }
  };

  // Mở modal chi tiết
  const openDetails = async teacher => {
    const token = localStorage.getItem('token');

    const res = await axios.get(`/api/teachers/detail/${teacher.teacher_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setTeacherDetail(res.data);
    setShowDetailModal(true);
  };

  const resetPassword = async teacher => {
    if (!window.confirm('Đặt lại mật khẩu giáo viên này về 123456?')) return;

    try {
      const token = localStorage.getItem('token');

      await axios.put(
        `/api/users/${teacher.user_id}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Đã đặt lại mật khẩu về 123456!');
    } catch (error) {
      console.error('🔥 RESET PASSWORD ERROR:', error.response?.data || error);
      alert(error.response?.data?.message || 'Không thể reset mật khẩu!');
    }
  };

  return (
    <div className="p-6">
      <div className="text-xl font-semibold mb-6">Quản Lý Giáo Viên</div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center bg-white px-4 py-2 rounded-lg border w-72 shadow-sm">
          <FiSearch className="text-gray-400 mr-2" />
          <input
            className="outline-none flex-1"
            placeholder="Tìm kiếm giáo viên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Teacher Cards */}
      <div className="grid grid-cols-2 gap-6">
        {filtered.map(teacher => (
          <div
            key={teacher.teacher_id}
            className="flex p-4 bg-blue-50 rounded-xl shadow hover:shadow-md transition relative"
          >
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 mr-4">
              Hình ảnh
            </div>
            {/* Info */}
            <div>
              <p>
                <b>User ID:</b> {teacher.user_id}
              </p>
              <p>
                <b>Mã GV:</b> {teacher.teacher_code}
              </p>
              <p>
                <b>Tên:</b> {teacher.user?.full_name}
              </p>
              <p>
                <b>Học hàm:</b> {teacher.academic_title}
              </p>
            </div>

            {/* Nút chi tiết */}
            <button
              onClick={() => openDetails(teacher)}
              className="absolute top-3 right-20 text-blue-500 hover:text-blue-700"
            >
              Chi tiết
            </button>

            {/* Nút sửa */}
            <button
              onClick={() => openEditModal(teacher)}
              className="absolute top-3 right-10 text-blue-500 hover:text-blue-700"
            >
              Sửa
            </button>

            {/* Reset Password */}
            <button
              onClick={() => resetPassword(teacher)}
              className="absolute top-3 right-36 text-orange-500 hover:text-orange-700"
            >
              Reset MK
            </button>

            {/* Delete */}
            {/* <FiTrash2
              onClick={() => deleteTeacher(teacher)}
              className="text-red-500 absolute top-3 right-3 cursor-pointer hover:text-red-700"
              size={20}
            /> */}
          </div>
        ))}
      </div>

      {/* Add Button */}
      <div className="flex justify-end mt-6">
        <button
          className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          onClick={() => setShowAddModal(true)}
        >
          Thêm Giáo Viên
        </button>
      </div>

      {/* Modal Thêm */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Thêm Giáo Viên</h2>

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
                placeholder="Mật khẩu"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="text"
                name="teacher_code"
                placeholder="Mã giáo viên"
                className="border p-2 rounded"
                onChange={handleInput}
              />
              <input
                type="text"
                name="academic_title"
                placeholder="Học vị"
                className="border p-2 rounded"
                onChange={handleInput}
              />
            </div>

            <div className="flex justify-end mt-5 gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleAddTeacher}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sửa */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Sửa Giáo Viên</h2>

            <div className="grid grid-cols-1 gap-3">
              <input
                type="text"
                value={editTeacher.full_name}
                className="border p-2 rounded"
                onChange={e => setEditTeacher({ ...editTeacher, full_name: e.target.value })}
              />

              <input
                type="email"
                value={editTeacher.email}
                className="border p-2 rounded"
                onChange={e => setEditTeacher({ ...editTeacher, email: e.target.value })}
              />

              <input
                type="text"
                value={editTeacher.phone}
                className="border p-2 rounded"
                onChange={e => setEditTeacher({ ...editTeacher, phone: e.target.value })}
              />

              <input
                type="text"
                value={editTeacher.status}
                className="border p-2 rounded"
                onChange={e => setEditTeacher({ ...editTeacher, status: e.target.value })}
              />

              <input
                type="text"
                value={editTeacher.teacher_code}
                className="border p-2 rounded"
                onChange={e => setEditTeacher({ ...editTeacher, teacher_code: e.target.value })}
              />

              <input
                type="text"
                value={editTeacher.academic_title}
                className="border p-2 rounded"
                onChange={e => setEditTeacher({ ...editTeacher, academic_title: e.target.value })}
              />
            </div>

            <div className="flex justify-end mt-5 gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Hủy
              </button>
              <button
                onClick={handleUpdateTeacher}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết */}
      {showDetailModal && teacherDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Thông Tin Giáo Viên</h2>

            {/* Nội dung thông tin */}
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p>
                <span className="font-semibold">User ID:</span> {teacherDetail?.user?.user_id}
              </p>
              <p>
                <span className="font-semibold">Teacher ID:</span> {teacherDetail?.teacher_id}
              </p>
              <p>
                <span className="font-semibold">Mã GV:</span> {teacherDetail?.teacher_code}
              </p>
              <p>
                <span className="font-semibold">Họ tên:</span> {teacherDetail?.user?.full_name}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {teacherDetail?.user?.email}
              </p>
              <p>
                <span className="font-semibold">Điện thoại:</span> {teacherDetail?.user?.phone}
              </p>
              <p>
                <span className="font-semibold">Trạng thái:</span> {teacherDetail?.user?.status}
              </p>

              <p>
                <span className="font-semibold">Ngày tạo:</span>{' '}
                {new Date(teacherDetail?.user?.created_at).toLocaleString('vi-VN')}
              </p>

              <p>
                <span className="font-semibold">Ngày cập nhật:</span>{' '}
                {new Date(teacherDetail?.user?.updated_at).toLocaleString('vi-VN')}
              </p>

              <p>
                <span className="font-semibold">Học hàm:</span> {teacherDetail?.academic_title}
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
