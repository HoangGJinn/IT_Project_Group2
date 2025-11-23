# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

### POST /auth/login
Đăng nhập

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "user_id": 1,
    "email": "user@example.com",
    "full_name": "Nguyễn Văn A",
    "roles": ["TEACHER"]
  }
}
```

### POST /auth/register
Đăng ký tài khoản mới

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "Nguyễn Văn A",
  "phone": "0123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "user_id": 1
}
```

### POST /auth/google
Đăng nhập với Google

**Request Body:**
```json
{
  "id_token": "google_id_token"
}
```

---

## Users

### GET /users/profile
Lấy thông tin profile của user hiện tại

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "user_id": 1,
  "email": "user@example.com",
  "full_name": "Nguyễn Văn A",
  "phone": "0123456789",
  "status": "ACTIVE"
}
```

### PUT /users/profile
Cập nhật thông tin profile

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "full_name": "Nguyễn Văn B",
  "phone": "0987654321"
}
```

### PUT /users/change-password
Đổi mật khẩu

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "old_password": "old_password",
  "new_password": "new_password"
}
```

---

## Classes (Giáo viên)

### GET /classes
Lấy danh sách lớp học của giáo viên

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `school_year` (optional): Năm học (VD: "2024-2025")
- `semester` (optional): Học kì (HK1, HK2, HK3)
- `search` (optional): Tìm kiếm theo tên/mã lớp

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "class_id": 1,
      "class_code": "WEB001",
      "name": "Lập Trình Web",
      "image_url": "https://...",
      "semester": "HK1",
      "school_year": "2024-2025",
      "schedule_days": "Thứ 2, Thứ 5",
      "schedule_periods": "7->10",
      "teacher": {
        "teacher_id": 1,
        "full_name": "Nguyễn Văn A"
      }
    }
  ]
}
```

### GET /classes/:id
Lấy chi tiết lớp học

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "class_id": 1,
    "class_code": "WEB001",
    "name": "Lập Trình Web",
    "image_url": "https://...",
    "semester": "HK1",
    "school_year": "2024-2025",
    "capacity": 50,
    "planned_sessions": 45,
    "teacher": {...},
    "course": {...},
    "students_count": 45
  }
}
```

### POST /classes
Tạo lớp học mới

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "course_id": 1,
  "class_code": "WEB001",
  "name": "Lập Trình Web",
  "semester": "HK1",
  "school_year": "2024-2025",
  "capacity": 50,
  "planned_sessions": 45,
  "schedule_days": "Thứ 2, Thứ 5",
  "schedule_periods": "7->10",
  "image_url": "https://..."
}
```

### PUT /classes/:id
Cập nhật thông tin lớp học

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Lập Trình Web - Cập nhật",
  "capacity": 60,
  "image_url": "https://..."
}
```

### DELETE /classes/:id
Xóa lớp học

**Headers:**
```
Authorization: Bearer {token}
```

---

## Students (Danh sách sinh viên trong lớp)

### GET /classes/:id/students
Lấy danh sách sinh viên trong lớp

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "student_id": 1,
      "student_code": "23110987",
      "full_name": "Nguyễn Văn A",
      "total_sessions": 45,
      "attended_sessions": 43,
      "attendance_rate": "95.6%"
    }
  ]
}
```

### POST /classes/:id/students
Thêm sinh viên vào lớp

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "student_id": 1
}
```

### DELETE /classes/:id/students/:studentId
Xóa sinh viên khỏi lớp

**Headers:**
```
Authorization: Bearer {token}
```

---

## Sessions (Buổi học)

### GET /classes/:id/sessions
Lấy danh sách buổi học của lớp

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": 1,
      "date": "2024-11-20",
      "start_time": "07:00:00",
      "end_time": "10:00:00",
      "room": "A112",
      "topic": "React Hooks và State Management",
      "status": "FINISHED",
      "materials": [
        {
          "material_id": 1,
          "name": "Bài giảng tuần 1.pdf",
          "file_url": "https://...",
          "file_type": "pdf",
          "file_size": 2621440
        }
      ]
    }
  ]
}
```

### POST /classes/:id/sessions
Tạo buổi học mới

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "date": "2024-11-25",
  "start_time": "07:00:00",
  "end_time": "10:00:00",
  "room": "A112",
  "topic": "Next.js Framework"
}
```

### PUT /sessions/:id
Cập nhật buổi học

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "topic": "Next.js Framework - Cập nhật",
  "room": "A113"
}
```

---

## Attendance (Điểm danh)

### POST /sessions/:id/attendance/start
Bắt đầu điểm danh (tạo QR code)

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "method": "QR",
  "duration_minutes": 15,
  "late_after_minutes": 15
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance_session_id": 1,
    "qr_token": "abc123def456",
    "expires_at": "2024-11-20T07:15:00Z"
  }
}
```

### POST /attendance/scan
Quét QR code để điểm danh (Sinh viên)

**Request Body:**
```json
{
  "token": "abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Điểm danh thành công",
  "data": {
    "status": "PRESENT",
    "checkin_time": "2024-11-20T07:05:00Z",
    "class_info": {
      "class_id": 1,
      "class_code": "WEB001",
      "name": "Lập Trình Web"
    }
  }
}
```

### GET /sessions/:id/attendance
Lấy danh sách điểm danh của buổi học

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "record_id": 1,
      "student": {
        "student_id": 1,
        "student_code": "23110987",
        "full_name": "Nguyễn Văn A"
      },
      "status": "PRESENT",
      "checkin_time": "2024-11-20T07:05:00Z",
      "source": "QR"
    }
  ]
}
```

### PUT /attendance/:recordId
Cập nhật trạng thái điểm danh (Giáo viên)

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "status": "LATE",
  "note": "Đến muộn 10 phút"
}
```

---

## Student Classes (Sinh viên)

### GET /student/classes
Lấy danh sách lớp học của sinh viên

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `school_year` (optional)
- `semester` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "class_id": 1,
      "class_code": "WEB001",
      "name": "Lập Trình Web",
      "image_url": "https://...",
      "teacher": {
        "full_name": "Nguyễn Văn A"
      },
      "attendance_rate": "95.6%",
      "total_sessions": 45,
      "attended_sessions": 43
    }
  ]
}
```

### GET /student/classes/:id
Lấy chi tiết lớp học (view của sinh viên)

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "class_id": 1,
    "class_code": "WEB001",
    "name": "Lập Trình Web",
    "teacher": {...},
    "schedule_days": "Thứ 2, Thứ 5",
    "schedule_periods": "7->10",
    "attendance_stats": {
      "total_sessions": 45,
      "attended_sessions": 43,
      "attendance_rate": "95.6%"
    },
    "sessions": [...],
    "materials": [...]
  }
}
```

---

## Attendance History (Lịch sử điểm danh)

### GET /student/attendance
Lấy lịch sử điểm danh của sinh viên

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `class_id` (optional): Lọc theo lớp
- `status` (optional): Lọc theo trạng thái (PRESENT, LATE, ABSENT)
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 45,
    "on_time": 40,
    "late": 3,
    "absent": 2
  },
  "data": [
    {
      "record_id": 1,
      "class": {
        "class_id": 1,
        "class_code": "WEB001",
        "name": "Lập Trình Web"
      },
      "session": {
        "session_id": 1,
        "date": "2024-11-20",
        "time": "07:00:00",
        "room": "A112"
      },
      "status": "PRESENT",
      "checkin_time": "2024-11-20T07:05:00Z"
    }
  ]
}
```

---

## Reports (Báo cáo)

### GET /reports/attendance
Báo cáo tổng hợp điểm danh

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `school_year` (required)
- `semester` (required)
- `course_id` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "on_time": 85,
      "late": 10,
      "absent": 5
    },
    "students": [
      {
        "student_id": 1,
        "student_code": "23110987",
        "full_name": "Nguyễn Văn A",
        "total_sessions": "45/45",
        "attendance_rate": "100%"
      }
    ]
  }
}
```

### GET /reports/export
Xuất file báo cáo

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `school_year` (required)
- `semester` (required)
- `format` (optional): "excel" hoặc "pdf" (mặc định: "excel")

**Response:** File download

---

## Materials (Tài liệu)

### POST /sessions/:id/materials
Upload tài liệu cho buổi học

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- `file`: File cần upload
- `name`: Tên tài liệu

**Response:**
```json
{
  "success": true,
  "data": {
    "material_id": 1,
    "name": "Bài giảng tuần 1.pdf",
    "file_url": "https://...",
    "file_type": "pdf",
    "file_size": 2621440
  }
}
```

### DELETE /materials/:id
Xóa tài liệu

**Headers:**
```
Authorization: Bearer {token}
```

---

## Schedule (Lịch dạy)

### GET /schedule
Lấy lịch dạy của giáo viên

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `week_start` (optional): Ngày bắt đầu tuần (YYYY-MM-DD)
- `week_end` (optional): Ngày kết thúc tuần (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "week_start": "2024-11-18",
    "week_end": "2024-11-24",
    "schedule": [
      {
        "day": 1,
        "day_name": "Thứ 2",
        "sessions": [
          {
            "session_id": 1,
            "class": {
              "class_id": 1,
              "class_code": "WEB001",
              "name": "Lập Trình Web"
            },
            "start_time": "07:00:00",
            "end_time": "10:00:00",
            "room": "A112"
          }
        ]
      }
    ]
  }
}
```

---

## Error Response Format

Tất cả các API trả về lỗi theo format:

```json
{
  "success": false,
  "message": "Thông báo lỗi",
  "error": "Chi tiết lỗi (nếu có)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

