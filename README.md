# Đồ Án CNTT - Hệ Thống Quản Lý Điểm Danh

Dự án sử dụng ExpressJS cho Backend và ReactJS cho Frontend với MySQL Sequelize CLI.

## Cấu trúc dự án

```
Do_An_CNTT/
├── backend/          # Backend sử dụng ExpressJS
└── frontend/         # Frontend sử dụng ReactJS
```

## Yêu cầu hệ thống

- Node.js (v16 trở lên)
- npm hoặc yarn
- MySQL (v8.0 trở lên)

## Cài đặt

### 1. Cài đặt Backend

```bash
cd backend
npm install
```

### 2. Cài đặt Frontend

```bash
cd frontend
npm install
```

### 3. Cấu hình Database

1. Tạo database từ file SQL:

```bash
mysql -u root -p < Class_Management_COMPLETE.sql
```

2. Tạo file `.env` trong thư mục `backend/`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=attendance_db
DB_USER=root
DB_PASSWORD=your_password
```

3. Khởi tạo Sequelize (nếu chưa có):

```bash
cd backend
npx sequelize-cli init
```

## Chạy ứng dụng

### Backend

```bash
cd backend
npm start
# hoặc
node index.js
```

Backend chạy tại `http://localhost:5000` (mặc định)

### Frontend

```bash
cd frontend
npm run dev
```

Frontend chạy tại `http://localhost:3000`

## Các gói đã cài đặt

### Backend

- express, sequelize, sequelize-cli, mysql2, cors, dotenv

### Frontend

- react, react-dom, vite, tailwindcss, bootstrap, react-router-dom, axios, react-icons

## Tài liệu API

Xem file [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) để biết chi tiết các API endpoints.

## 📝 Commit Code

Dự án sử dụng **Conventional Commits** để đảm bảo commit message nhất quán.

### Format:

```
<type>(<scope>): <subject>
```

### Ví dụ:

```bash
git commit -m "feat(backend): thêm API điểm danh QR"
git commit -m "fix(frontend): sửa lỗi hiển thị lớp học"
```

### Cài đặt (sau khi clone):

```bash
npm install
```

Xem [COMMIT_GUIDE.md](./COMMIT_GUIDE.md) để biết chi tiết.
