# Backend - Hệ Thống Quản Lý Điểm Danh

Backend API server sử dụng Express.js, Sequelize ORM và MySQL.

## 🚀 Công nghệ

- **Express.js** (v5.1.0) - Web framework
- **Sequelize** (v6.37.7) - ORM
- **MySQL2** (v3.15.3) - Database driver
- **JWT** (v9.0.2) - Authentication
- **bcryptjs** (v3.0.3) - Password hashing
- **google-auth-library** (v10.5.0) - Google OAuth
- **cors** (v2.8.5) - CORS middleware
- **dotenv** (v17.2.3) - Environment variables

## 📋 Yêu cầu

- Node.js v16+
- MySQL v8.0+
- npm hoặc yarn

## 🔧 Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình Database

Chạy SQL file để tạo database:

```bash
mysql -u root -p < ../Class_Management_COMPLETE.sql
```

### 3. Cấu hình Environment

Copy `.env.example` thành `.env` và chỉnh sửa:

```bash
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:
- Database credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- JWT_SECRET (chuỗi ngẫu nhiên mạnh)
- PORT (mặc định: 5000)
- CORS_ORIGIN (URL frontend)
- GOOGLE_CLIENT_ID (nếu dùng Google Sign-In)

## 🏃 Chạy ứng dụng

### Development

```bash
npm run dev
```

Server chạy tại `http://localhost:5000`

### Production

```bash
npm start
```

## 📁 Cấu trúc

```
backend/
├── config/         # Database config
├── controllers/    # Business logic
├── middleware/     # Auth middleware
├── models/         # Sequelize models
├── routes/         # API routes
├── utils/          # Utilities
├── app.js          # Express app
└── index.js        # Entry point
```

## 🔑 API Endpoints

- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/google` - Google Sign-In
- `GET /api/users/profile` - Thông tin user
- `GET /api/classes` - Danh sách lớp học
- `GET /api/student/classes` - Lớp học của sinh viên
- `GET /api/student/attendance` - Lịch sử điểm danh

Xem chi tiết tại [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)

## 🐛 Troubleshooting

**Lỗi kết nối database:**
- Kiểm tra MySQL đang chạy
- Kiểm tra thông tin trong `.env`

**Lỗi CORS:**
- Kiểm tra `CORS_ORIGIN` trong `.env` khớp với frontend URL
