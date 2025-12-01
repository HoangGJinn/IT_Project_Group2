const { Sequelize } = require('sequelize');
const config = require('../config/config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Import models
const User = require('./User')(sequelize);
const Role = require('./Role')(sequelize);
const UserRole = require('./UserRole')(sequelize);
const Department = require('./Department')(sequelize);
const Student = require('./Student')(sequelize);
const Teacher = require('./Teacher')(sequelize);
const Course = require('./Course')(sequelize);
const Class = require('./Class')(sequelize);
const Enrollment = require('./Enrollment')(sequelize);
const Session = require('./Session')(sequelize);
const AttendanceSession = require('./AttendanceSession')(sequelize);
const QRToken = require('./QRToken')(sequelize);
const AttendanceRecord = require('./AttendanceRecord')(sequelize);
const Excuse = require('./Excuse')(sequelize);
const SessionMaterial = require('./SessionMaterial')(sequelize);
const AuthProvider = require('./AuthProvider')(sequelize);
const Notification = require('./Notification')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const SystemSetting = require('./SystemSetting')(sequelize);

// Define associations
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(User, { foreignKey: 'department_id' });

User.belongsToMany(Role, { through: UserRole, foreignKey: 'user_id', as: 'roles' });
Role.belongsToMany(User, { through: UserRole, foreignKey: 'role_id' });

Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Student, { foreignKey: 'user_id' });

Teacher.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Teacher, { foreignKey: 'user_id' });

Course.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
Department.hasMany(Course, { foreignKey: 'department_id' });

Class.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Course.hasMany(Class, { foreignKey: 'course_id' });

Class.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
Teacher.hasMany(Class, { foreignKey: 'teacher_id' });

Enrollment.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(Enrollment, { foreignKey: 'class_id' });

Enrollment.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(Enrollment, { foreignKey: 'student_id' });

Session.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
Class.hasMany(Session, { foreignKey: 'class_id' });

Session.hasMany(SessionMaterial, { foreignKey: 'session_id', as: 'materials' });

AttendanceSession.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Session.hasOne(AttendanceSession, { foreignKey: 'session_id', as: 'attendanceSession' });

QRToken.belongsTo(AttendanceSession, { foreignKey: 'attendance_session_id', as: 'attendanceSession' });
AttendanceSession.hasOne(QRToken, { foreignKey: 'attendance_session_id', as: 'qrToken' });

AttendanceRecord.belongsTo(AttendanceSession, { foreignKey: 'attendance_session_id', as: 'attendanceSession' });
AttendanceSession.hasMany(AttendanceRecord, { foreignKey: 'attendance_session_id', as: 'attendanceRecords' });

AttendanceRecord.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Student.hasMany(AttendanceRecord, { foreignKey: 'student_id' });

Excuse.belongsTo(AttendanceSession, { foreignKey: 'attendance_session_id', as: 'attendanceSession' });
Excuse.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
Excuse.belongsTo(Teacher, { foreignKey: 'reviewed_by', as: 'reviewer' });

SessionMaterial.belongsTo(Session, { foreignKey: 'session_id', as: 'session' });
Session.hasMany(SessionMaterial, { foreignKey: 'session_id' });

SessionMaterial.belongsTo(Teacher, { foreignKey: 'uploaded_by', as: 'uploader' });

AuthProvider.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(AuthProvider, { foreignKey: 'user_id' });

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id' });

AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

const db = {
  sequelize,
  Sequelize,
  User,
  Role,
  UserRole,
  Department,
  Student,
  Teacher,
  Course,
  Class,
  Enrollment,
  Session,
  AttendanceSession,
  QRToken,
  AttendanceRecord,
  Excuse,
  SessionMaterial,
  AuthProvider,
  Notification,
  AuditLog,
  SystemSetting
};

module.exports = db;
