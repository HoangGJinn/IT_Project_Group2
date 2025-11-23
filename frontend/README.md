# Frontend - Hệ Thống Quản Lý Điểm Danh

Frontend application sử dụng React.js với Vite.

## 🚀 Công nghệ

- **React** (v19.2.0) - UI library
- **Vite** (v7.2.4) - Build tool
- **React Router DOM** (v7.9.6) - Routing
- **Tailwind CSS** (v3.4.18) - CSS framework
- **Bootstrap** (v5.3.8) - CSS framework
- **React Bootstrap** (v2.10.10) - Bootstrap components
- **Axios** (v1.13.2) - HTTP client
- **React Icons** (v5.5.0) - Icons

## 📋 Yêu cầu

- Node.js v16+
- npm hoặc yarn

## 🔧 Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình Environment

Copy `.env.example` thành `.env` và chỉnh sửa:

```bash
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:
- `VITE_API_BASE_URL` - URL backend (mặc định: http://localhost:5000)
- `VITE_PORT` - Port frontend (mặc định: 3000)
- `VITE_GOOGLE_CLIENT_ID` - Google Client ID (nếu dùng Google Sign-In)

## 🏃 Chạy ứng dụng

### Development

```bash
npm run dev
```

Ứng dụng chạy tại `http://localhost:3000`

### Build Production

```bash
npm run build
```

Files build nằm trong `dist/`

### Preview Build

```bash
npm run preview
```

## 📁 Cấu trúc

```
frontend/
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── utils/         # Utilities (api, auth)
│   ├── styles/        # Global styles
│   ├── App.jsx        # Main app với routing
│   └── main.jsx       # Entry point
├── index.html
└── vite.config.js
```

## 🛣️ Routes

**Public:**
- `/login` - Đăng nhập
- `/register` - Đăng ký

**Teacher:**
- `/classes` - Quản lý lớp học
- `/classes/:id` - Chi tiết lớp
- `/schedule` - Lịch giảng dạy
- `/report` - Báo cáo
- `/account` - Thông tin tài khoản

**Student:**
- `/student/classes` - Lớp học của tôi
- `/student/scan` - Quét QR điểm danh
- `/student/attendance` - Lịch sử điểm danh
- `/student/account` - Thông tin tài khoản

## 🐛 Troubleshooting

**Lỗi kết nối API:**
- Kiểm tra backend đang chạy
- Kiểm tra `VITE_API_BASE_URL` trong `.env`

**Lỗi Google Sign-In:**
- Kiểm tra `VITE_GOOGLE_CLIENT_ID` trong `.env`
- Kiểm tra cấu hình trong Google Cloud Console
