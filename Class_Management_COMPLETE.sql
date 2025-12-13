-- ===== 0) Create & select database =====
CREATE DATABASE IF NOT EXISTS attendance_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE attendance_db;

-- ===== Pass 1: clean drop (child -> parent) =====
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS session_materials;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS allowed_domains;
DROP TABLE IF EXISTS auth_providers;
DROP TABLE IF EXISTS excuses;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS qr_tokens;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;

-- ===== Pass 2: per-table DROP -> CREATE (parent -> child) =====

-- ===== Foundations =====

-- 1) departments
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
  department_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(20)  NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2) users
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  user_id       BIGINT PRIMARY KEY AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(20)  NULL,
  status        ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  department_id BIGINT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id)
    REFERENCES departments(department_id) ON DELETE SET NULL,
  INDEX idx_users_email (email),
  INDEX idx_users_status (status)
);

-- 3) roles
DROP TABLE IF EXISTS roles;
CREATE TABLE roles (
  role_id TINYINT PRIMARY KEY,
  code    ENUM('ADMIN','TEACHER','STUDENT','TA','DEPT_ADMIN') NOT NULL UNIQUE,
  name    VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4) user_roles
DROP TABLE IF EXISTS user_roles;
CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id TINYINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- ===== People =====

-- 5) students
DROP TABLE IF EXISTS students;
CREATE TABLE students (
  student_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT NOT NULL UNIQUE,
  student_code VARCHAR(50) NOT NULL UNIQUE,
  class_cohort VARCHAR(50) NULL,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 6) teachers
DROP TABLE IF EXISTS teachers;
CREATE TABLE teachers (
  teacher_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id        BIGINT NOT NULL UNIQUE,
  teacher_code   VARCHAR(50) UNIQUE,
  academic_title VARCHAR(50) NULL,
  CONSTRAINT fk_teachers_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===== Courses & Classes =====

-- 7) courses
DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
  course_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  code          VARCHAR(50) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  credits       TINYINT NOT NULL,
  department_id BIGINT NULL,
  CONSTRAINT fk_courses_department FOREIGN KEY (department_id)
    REFERENCES departments(department_id) ON DELETE SET NULL
);

-- 8) classes
DROP TABLE IF EXISTS classes;
CREATE TABLE classes (
  class_id               BIGINT PRIMARY KEY AUTO_INCREMENT,
  course_id              BIGINT NOT NULL,
  class_code             VARCHAR(50) NOT NULL UNIQUE,
  name                   VARCHAR(255) NULL,
  image_url              VARCHAR(500) NULL COMMENT 'URL hình ảnh lớp học',
  teacher_id             BIGINT NOT NULL,
  semester               ENUM('HK1','HK2','HK3') NOT NULL,
  school_year            VARCHAR(9) NOT NULL,
  capacity               INT NULL,
  planned_sessions        SMALLINT NULL,
  default_duration_min   SMALLINT NULL DEFAULT 90,
  default_late_after_min SMALLINT NULL DEFAULT 15,
  default_method         ENUM('QR','CODE','MANUAL','GEO') NULL DEFAULT 'QR',
  schedule_days          VARCHAR(100) NULL COMMENT 'VD: "Thứ 2, Thứ 5"',
  schedule_periods       VARCHAR(50) NULL COMMENT 'VD: "7->10"',
  start_date             DATE NULL COMMENT 'Ngày bắt đầu môn học',
  end_date               DATE NULL COMMENT 'Ngày kết thúc môn học',
  early_start_minutes    SMALLINT NULL DEFAULT 0 COMMENT 'Cho phép bắt đầu điểm danh trước giờ học (phút)',
  latitude               DECIMAL(10, 8) NULL COMMENT 'Vĩ độ của địa điểm lớp học',
  longitude              DECIMAL(11, 8) NULL COMMENT 'Kinh độ của địa điểm lớp học',
  location_radius        INT NULL DEFAULT 100 COMMENT 'Bán kính cho phép điểm danh (mét), mặc định 100m',
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_classes_course  FOREIGN KEY (course_id)  REFERENCES courses(course_id),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
  INDEX idx_classes_year_semester (school_year, semester),
  INDEX idx_classes_teacher (teacher_id),
  INDEX idx_classes_course (course_id)
) COMMENT='Bảng quản lý lớp học, bao gồm thông tin lớp, giáo viên, học kì, năm học';

-- 9) enrollments
DROP TABLE IF EXISTS enrollments;
CREATE TABLE enrollments (
  enrollment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  class_id      BIGINT NOT NULL,
  student_id    BIGINT NOT NULL,
  status        ENUM('ENROLLED','DROPPED') NOT NULL DEFAULT 'ENROLLED',
  joined_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollments_class_student (class_id, student_id),
  CONSTRAINT fk_enrollments_class   FOREIGN KEY (class_id)   REFERENCES classes(class_id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_enrollments_student (student_id),
  INDEX idx_enrollments_class (class_id)
);

-- ===== Sessions & Attendance (on-demand) =====

-- 10) sessions
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  session_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  class_id   BIGINT NOT NULL,
  date       DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NULL,
  room       VARCHAR(50) NULL COMMENT 'Phòng học',
  topic      VARCHAR(255) NULL COMMENT 'Chủ đề buổi học',
  status     ENUM('ONGOING','FINISHED','CANCELLED') NOT NULL DEFAULT 'ONGOING',
  note       VARCHAR(255) NULL,
  CONSTRAINT fk_sessions_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  INDEX idx_sessions_class_date (class_id, date),
  INDEX idx_sessions_status_date (status, date)
) COMMENT='Bảng quản lý các buổi học, bao gồm ngày, giờ, phòng, chủ đề';

-- 11) attendance_sessions
DROP TABLE IF EXISTS attendance_sessions;
CREATE TABLE attendance_sessions (
  attendance_session_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL UNIQUE,
  method    ENUM('QR','CODE','MANUAL','GEO') NOT NULL,
  open_at   DATETIME NOT NULL,
  close_at  DATETIME NULL,
  late_after_minutes SMALLINT NULL,
  teacher_latitude DECIMAL(10, 8) NULL,
  teacher_longitude DECIMAL(11, 8) NULL,
  location_radius INT DEFAULT 10 COMMENT 'Bán kính cho phép điểm danh (mét), mặc định 10m',
  CONSTRAINT fk_att_sess_session FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- 12) qr_tokens
DROP TABLE IF EXISTS qr_tokens;
CREATE TABLE qr_tokens (
  qr_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  attendance_session_id BIGINT NOT NULL,
  token CHAR(16) NOT NULL UNIQUE,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  KEY idx_qr_att_sess_exp (attendance_session_id, expires_at),
  CONSTRAINT fk_qr_attendance_session FOREIGN KEY (attendance_session_id)
    REFERENCES attendance_sessions(attendance_session_id) ON DELETE CASCADE,
  INDEX idx_qr_token (token)
);

-- 13) attendance_records
DROP TABLE IF EXISTS attendance_records;
CREATE TABLE attendance_records (
  record_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  attendance_session_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  checkin_time DATETIME NULL,
  status ENUM('PRESENT','LATE','ABSENT','EXCUSED') NOT NULL DEFAULT 'ABSENT',
  source ENUM('QR','CODE','MANUAL','GEO') NULL,
  note VARCHAR(255) NULL,
  latitude DECIMAL(10, 8) NULL COMMENT 'Vĩ độ nơi điểm danh',
  longitude DECIMAL(11, 8) NULL COMMENT 'Kinh độ nơi điểm danh',
  no_gps_reason TEXT NULL COMMENT 'Lý do không có GPS khi điểm danh',
  is_valid TINYINT(1) DEFAULT 1 COMMENT 'Điểm danh hợp lệ (1) hay không hợp lệ (0), NULL nếu chưa đánh giá',
  UNIQUE KEY uq_att_rec (attendance_session_id, student_id),
  KEY idx_att_rec_session (attendance_session_id),
  KEY idx_att_rec_student (student_id),
  CONSTRAINT fk_att_rec_att_session FOREIGN KEY (attendance_session_id)
    REFERENCES attendance_sessions(attendance_session_id) ON DELETE CASCADE,
  CONSTRAINT fk_att_rec_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_att_rec_student_time (student_id, checkin_time),
  INDEX idx_att_rec_session_status (attendance_session_id, status)
) COMMENT='Bảng lưu trữ kết quả điểm danh của sinh viên';

-- 14) excuses
DROP TABLE IF EXISTS excuses;
CREATE TABLE excuses (
  excuse_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  attendance_session_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  proof_url VARCHAR(500) NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME NULL,
  KEY idx_excuses_session (attendance_session_id),
  KEY idx_excuses_student (student_id),
  CONSTRAINT fk_excuses_att_session FOREIGN KEY (attendance_session_id)
    REFERENCES attendance_sessions(attendance_session_id) ON DELETE CASCADE,
  CONSTRAINT fk_excuses_student FOREIGN KEY (student_id)
    REFERENCES students(student_id) ON DELETE CASCADE,
  CONSTRAINT fk_excuses_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES teachers(teacher_id) ON DELETE SET NULL
);

-- 15) session_materials
DROP TABLE IF EXISTS session_materials;
CREATE TABLE session_materials (
  material_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NULL COMMENT 'pdf, docx, mp4, etc.',
  file_size BIGINT NULL COMMENT 'Size in bytes',
  uploaded_by BIGINT NULL COMMENT 'teacher_id',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_materials_session FOREIGN KEY (session_id) 
    REFERENCES sessions(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_materials_uploader FOREIGN KEY (uploaded_by) 
    REFERENCES teachers(teacher_id) ON DELETE SET NULL,
  INDEX idx_materials_session (session_id),
  INDEX idx_materials_uploader (uploaded_by)
) COMMENT='Bảng lưu trữ tài liệu học tập cho từng buổi học';

-- ===== Auth & Policy =====

-- 16) auth_providers
DROP TABLE IF EXISTS auth_providers;
CREATE TABLE auth_providers (
  auth_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  provider ENUM('LOCAL','GOOGLE') NOT NULL DEFAULT 'LOCAL',
  provider_uid VARCHAR(255) UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auth_user (user_id),
  CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 17) allowed_domains
DROP TABLE IF EXISTS allowed_domains;
CREATE TABLE allowed_domains (
  domain_id INT PRIMARY KEY AUTO_INCREMENT,
  domain VARCHAR(100) NOT NULL UNIQUE,
  note VARCHAR(255) NULL
);

-- 18) audit_logs
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  action  VARCHAR(100) NOT NULL,
  entity  VARCHAR(100) NULL,
  entity_id BIGINT NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_user (user_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 19) notifications
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  body  VARCHAR(500) NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 20) system_settings
DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
  setting_id INT PRIMARY KEY AUTO_INCREMENT,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NULL,
  description VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (key_name)
);

-- ===== Seed Data =====

-- Seed roles
INSERT INTO roles (role_id, code, name) VALUES
  (1,'ADMIN','Quản trị viên'),
  (2,'TEACHER','Giáo viên'),
  (3,'STUDENT','Sinh viên')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Seed system settings
INSERT INTO system_settings (key_name, value, description) VALUES
  ('qr_default_duration_minutes', '15', 'Thời gian mặc định QR code có hiệu lực (phút)'),
  ('max_file_size_mb', '50', 'Kích thước file tối đa khi upload (MB)'),
  ('default_late_after_minutes', '15', 'Thời gian muộn mặc định (phút)')
ON DUPLICATE KEY UPDATE value=VALUES(value);

-- ===== Sample Data =====

-- Departments
INSERT INTO departments (department_id, code, name) VALUES
  (1, 'CNTT', 'Công nghệ thông tin'),
  (2, 'KT', 'Kế toán'),
  (3, 'QTKD', 'Quản trị kinh doanh')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Users (password: 123456 - hashed with bcrypt)
INSERT INTO users (user_id, email, password_hash, full_name, phone, status, department_id) VALUES
  (1, 'admin@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Nguyễn Văn Admin', '0123456789', 'ACTIVE', 1),
  (2, 'teacher1@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Trần Thị Giáo Viên', '0987654321', 'ACTIVE', 1),
  (3, 'teacher2@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Lê Văn Giảng Viên', '0912345678', 'ACTIVE', 1),
  (4, 'student1@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Nguyễn Văn A', '0901234567', 'ACTIVE', 1),
  (5, 'student2@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Trần Thị B', '0902345678', 'ACTIVE', 1),
  (6, 'student3@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Lê Văn C', '0903456789', 'ACTIVE', 1),
  (7, 'student4@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Phạm Thị D', '0904567890', 'ACTIVE', 1),
  (8, 'student5@example.com', '$2b$10$gJtYilpIsAGRlHnTvvEg7.sLLjbgQdP/H2am8FmCyZPTUXLbjulT6', 'Hoàng Văn E', '0905678901', 'ACTIVE', 1)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone);

-- User Roles
INSERT INTO user_roles (user_id, role_id) VALUES
  (1, 1), -- Admin
  (2, 2), -- Teacher 1
  (3, 2), -- Teacher 2
  (4, 3), -- Student 1
  (5, 3), -- Student 2
  (6, 3), -- Student 3
  (7, 3), -- Student 4
  (8, 3)  -- Student 5
ON DUPLICATE KEY UPDATE user_id=VALUES(user_id);

-- Teachers
INSERT INTO teachers (teacher_id, user_id, teacher_code, academic_title) VALUES
  (1, 2, 'GV001', 'Thạc sĩ'),
  (2, 3, 'GV002', 'Tiến sĩ')
ON DUPLICATE KEY UPDATE teacher_code=VALUES(teacher_code);

-- Students
INSERT INTO students (student_id, user_id, student_code, class_cohort) VALUES
  (1, 4, '23110987', 'K23'),
  (2, 5, '23110988', 'K23'),
  (3, 6, '23110989', 'K23'),
  (4, 7, '23110990', 'K23'),
  (5, 8, '23110991', 'K23')
ON DUPLICATE KEY UPDATE student_code=VALUES(student_code);

-- Courses
INSERT INTO courses (course_id, code, name, credits, department_id) VALUES
  (1, 'WEB001', 'Lập trình Web', 3, 1),
  (2, 'DB001', 'Cơ sở dữ liệu', 3, 1),
  (3, 'NET001', 'Mạng máy tính', 3, 1),
  (4, 'OOP001', 'Lập trình hướng đối tượng', 3, 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Classes
INSERT INTO classes (class_id, course_id, class_code, name, image_url, teacher_id, semester, school_year, capacity, planned_sessions, schedule_days, schedule_periods) VALUES
  (1, 1, 'WEB001-K23-HK1', 'Lập trình Web - K23 HK1', NULL, 1, 'HK1', '2024-2025', 50, 15, 'Thứ 2, Thứ 5', '7->10'),
  (2, 2, 'DB001-K23-HK1', 'Cơ sở dữ liệu - K23 HK1', NULL, 1, 'HK1', '2024-2025', 40, 15, 'Thứ 3', '1->4'),
  (3, 3, 'NET001-K23-HK1', 'Mạng máy tính - K23 HK1', NULL, 2, 'HK1', '2024-2025', 45, 15, 'Thứ 4', '7->10'),
  (4, 4, 'OOP001-K23-HK1', 'Lập trình hướng đối tượng - K23 HK1', NULL, 2, 'HK1', '2024-2025', 50, 15, 'Thứ 6', '1->4')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Enrollments
INSERT INTO enrollments (enrollment_id, class_id, student_id, status, joined_at) VALUES
  (1, 1, 1, 'ENROLLED', '2024-09-01 08:00:00'),
  (2, 1, 2, 'ENROLLED', '2024-09-01 08:00:00'),
  (3, 1, 3, 'ENROLLED', '2024-09-01 08:00:00'),
  (4, 1, 4, 'ENROLLED', '2024-09-01 08:00:00'),
  (5, 1, 5, 'ENROLLED', '2024-09-01 08:00:00'),
  (6, 2, 1, 'ENROLLED', '2024-09-01 08:00:00'),
  (7, 2, 2, 'ENROLLED', '2024-09-01 08:00:00'),
  (8, 2, 3, 'ENROLLED', '2024-09-01 08:00:00'),
  (9, 3, 1, 'ENROLLED', '2024-09-01 08:00:00'),
  (10, 3, 2, 'ENROLLED', '2024-09-01 08:00:00'),
  (11, 3, 4, 'ENROLLED', '2024-09-01 08:00:00'),
  (12, 4, 3, 'ENROLLED', '2024-09-01 08:00:00'),
  (13, 4, 4, 'ENROLLED', '2024-09-01 08:00:00'),
  (14, 4, 5, 'ENROLLED', '2024-09-01 08:00:00')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Sessions (some past sessions for class 1)
INSERT INTO sessions (session_id, class_id, date, start_time, end_time, room, topic, status) VALUES
  (1, 1, '2024-09-02', '07:00:00', '10:30:00', 'A112', 'Giới thiệu môn học và HTML cơ bản', 'FINISHED'),
  (2, 1, '2024-09-05', '07:00:00', '10:30:00', 'A112', 'CSS và Bootstrap', 'FINISHED'),
  (3, 1, '2024-09-09', '07:00:00', '10:30:00', 'A112', 'JavaScript cơ bản', 'FINISHED'),
  (4, 1, '2024-09-12', '07:00:00', '10:30:00', 'A112', 'ReactJS - Components', 'FINISHED'),
  (5, 1, '2024-09-16', '07:00:00', '10:30:00', 'A112', 'ReactJS - State và Props', 'FINISHED'),
  (6, 1, CURDATE(), '07:00:00', NULL, 'A112', 'ReactJS - Hooks', 'ONGOING')
ON DUPLICATE KEY UPDATE topic=VALUES(topic);

-- Attendance Sessions
INSERT INTO attendance_sessions (attendance_session_id, session_id, method, open_at, close_at, late_after_minutes) VALUES
  (1, 1, 'QR', '2024-09-02 07:00:00', '2024-09-02 07:15:00', 15),
  (2, 2, 'QR', '2024-09-05 07:00:00', '2024-09-05 07:15:00', 15),
  (3, 3, 'QR', '2024-09-09 07:00:00', '2024-09-09 07:15:00', 15),
  (4, 4, 'QR', '2024-09-12 07:00:00', '2024-09-12 07:15:00', 15),
  (5, 5, 'QR', '2024-09-16 07:00:00', '2024-09-16 07:15:00', 15)
ON DUPLICATE KEY UPDATE method=VALUES(method);

-- Attendance Records
INSERT INTO attendance_records (record_id, attendance_session_id, student_id, checkin_time, status, source) VALUES
  -- Session 1
  (1, 1, 1, '2024-09-02 07:05:00', 'PRESENT', 'QR'),
  (2, 1, 2, '2024-09-02 07:08:00', 'PRESENT', 'QR'),
  (3, 1, 3, '2024-09-02 07:20:00', 'LATE', 'QR'),
  (4, 1, 4, NULL, 'ABSENT', NULL),
  (5, 1, 5, '2024-09-02 07:03:00', 'PRESENT', 'QR'),
  -- Session 2
  (6, 2, 1, '2024-09-05 07:02:00', 'PRESENT', 'QR'),
  (7, 2, 2, '2024-09-05 07:10:00', 'PRESENT', 'QR'),
  (8, 2, 3, NULL, 'ABSENT', NULL),
  (9, 2, 4, '2024-09-05 07:05:00', 'PRESENT', 'QR'),
  (10, 2, 5, '2024-09-05 07:18:00', 'LATE', 'QR'),
  -- Session 3
  (11, 3, 1, '2024-09-09 07:01:00', 'PRESENT', 'QR'),
  (12, 3, 2, '2024-09-09 07:04:00', 'PRESENT', 'QR'),
  (13, 3, 3, '2024-09-09 07:06:00', 'PRESENT', 'QR'),
  (14, 3, 4, '2024-09-09 07:07:00', 'PRESENT', 'QR'),
  (15, 3, 5, '2024-09-09 07:09:00', 'PRESENT', 'QR'),
  -- Session 4
  (16, 4, 1, '2024-09-12 07:03:00', 'PRESENT', 'QR'),
  (17, 4, 2, NULL, 'ABSENT', NULL),
  (18, 4, 3, '2024-09-12 07:05:00', 'PRESENT', 'QR'),
  (19, 4, 4, '2024-09-12 07:12:00', 'PRESENT', 'QR'),
  (20, 4, 5, '2024-09-12 07:22:00', 'LATE', 'QR'),
  -- Session 5
  (21, 5, 1, '2024-09-16 07:02:00', 'PRESENT', 'QR'),
  (22, 5, 2, '2024-09-16 07:04:00', 'PRESENT', 'QR'),
  (23, 5, 3, '2024-09-16 07:06:00', 'PRESENT', 'QR'),
  (24, 5, 4, NULL, 'ABSENT', NULL),
  (25, 5, 5, '2024-09-16 07:08:00', 'PRESENT', 'QR')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ===== HOÀN TẤT =====
SELECT 'Database đã được tạo thành công với đầy đủ các bảng, indexes và dữ liệu mẫu!' AS status;