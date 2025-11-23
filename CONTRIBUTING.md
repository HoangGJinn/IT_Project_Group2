# Hướng Dẫn Commit Code

## 📝 Format Commit Message

Dự án sử dụng **Conventional Commits** để đảm bảo commit message nhất quán.

### Format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:

- **feat**: Thêm tính năng mới
- **fix**: Sửa lỗi
- **docs**: Cập nhật tài liệu
- **style**: Thay đổi format code (không ảnh hưởng logic)
- **refactor**: Refactor code
- **perf**: Cải thiện hiệu suất
- **test**: Thêm/sửa test
- **build**: Thay đổi build system
- **ci**: Thay đổi CI/CD
- **chore**: Công việc bảo trì
- **revert**: Revert commit trước đó

### Scope (tùy chọn):

- `backend`: Thay đổi ở backend
- `frontend`: Thay đổi ở frontend
- `auth`: Liên quan đến authentication
- `api`: Liên quan đến API
- `ui`: Liên quan đến UI

### Ví dụ:

✅ **Đúng:**

```
feat(backend): thêm API đăng nhập với Google

fix(frontend): sửa lỗi hiển thị danh sách lớp học

docs: cập nhật README với hướng dẫn cài đặt

refactor(auth): tối ưu middleware xác thực
```

❌ **Sai:**

```
update code
fixed bug
thêm tính năng mới
sửa lỗi
```

## 🔧 Cài Đặt

Sau khi clone project, chạy:

```bash
npm install
```

Lệnh này sẽ tự động cài đặt:

- Husky (git hooks)
- Commitlint (kiểm tra commit message)
- Prettier (format code)
- ESLint (lint code)
- Lint-staged (chạy checks trước khi commit)

## 🚀 Quy Trình Commit

1. **Tạo branch mới:**

   ```bash
   git checkout -b feat/ten-tinh-nang
   ```

2. **Làm việc và commit:**

   ```bash
   git add .
   git commit -m "feat(backend): thêm API điểm danh QR"
   ```

3. **Push lên GitHub:**
   ```bash
   git push origin feat/ten-tinh-nang
   ```

## ⚠️ Lưu Ý

- Commit message sẽ được kiểm tra tự động
- Code sẽ được format tự động trước khi commit
- Nếu commit message sai format, commit sẽ bị từ chối
- Luôn chạy `npm install` sau khi pull code mới

## 📋 Checklist Trước Khi Commit

- [ ] Code đã được format (Prettier)
- [ ] Không có lỗi ESLint
- [ ] Commit message đúng format
- [ ] Đã test code hoạt động
- [ ] Không commit file `.env` hoặc `node_modules`
