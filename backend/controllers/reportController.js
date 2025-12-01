const { AttendanceRecord, Student, User, Class, Session, AttendanceSession, Enrollment } = require('../models');
const { Op } = require('sequelize');

const getAttendanceReport = async (req, res) => {
  try {
    const { school_year, semester, course_id } = req.query;

    if (!school_year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'school_year and semester are required'
      });
    }

    // Get classes
    const where = { school_year, semester };
    if (course_id) where.course_id = course_id;

    const classes = await Class.findAll({ where });
    const classIds = classes.map(c => c.class_id);

    // Get all sessions for these classes
    let sessions = [];
    if (classIds.length > 0) {
      sessions = await Session.findAll({
        where: {
          class_id: { [Op.in]: classIds },
          status: 'FINISHED'
        }
      });
    }

    const sessionIds = sessions.map(s => s.session_id);

    // Get attendance records
    let attendanceSessions = [];
    if (sessionIds.length > 0) {
      attendanceSessions = await AttendanceSession.findAll({
        where: {
          session_id: { [Op.in]: sessionIds }
        }
      });
    }

    const attendanceSessionIds = attendanceSessions.map(as => as.attendance_session_id);

    let records = [];
    if (attendanceSessionIds.length > 0) {
      records = await AttendanceRecord.findAll({
        where: {
          attendance_session_id: { [Op.in]: attendanceSessionIds }
        },
        include: [{
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['full_name']
          }]
        }]
      });
    }

    // Calculate overview
    const total = records.length;
    const onTime = records.filter(r => r.status === 'PRESENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;

    // Group by student
    const studentMap = new Map();
    records.forEach(record => {
      const studentId = record.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_code: record.student.student_code,
          full_name: record.student.user.full_name,
          total: 0,
          attended: 0
        });
      }
      const student = studentMap.get(studentId);
      student.total++;
      if (record.status === 'PRESENT' || record.status === 'LATE') {
        student.attended++;
      }
    });

    const students = Array.from(studentMap.values()).map(s => ({
      student_id: s.student_id,
      student_code: s.student_code,
      full_name: s.full_name,
      total_sessions: `${s.attended}/${s.total}`,
      attendance_rate: s.total > 0 ? ((s.attended / s.total) * 100).toFixed(0) + '%' : '0%'
    }));

    res.json({
      success: true,
      data: {
        overview: {
          on_time: total > 0 ? Math.round((onTime / total) * 100) : 0,
          late: total > 0 ? Math.round((late / total) * 100) : 0,
          absent: total > 0 ? Math.round((absent / total) * 100) : 0,
          on_time_count: onTime,
          late_count: late,
          absent_count: absent,
          total_records: total
        },
        students
      }
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getClassReport = async (req, res) => {
  try {
    const { classId } = req.params;

    // Get class info
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get all sessions for this class (both FINISHED and ONGOING)
    const sessions = await Session.findAll({
      where: {
        class_id: classId,
        status: { [Op.in]: ['FINISHED', 'ONGOING'] }
      },
      order: [['date', 'ASC']]
    });

    const sessionIds = sessions.map(s => s.session_id);

    // Get attendance records
    let attendanceSessions = [];
    if (sessionIds.length > 0) {
      attendanceSessions = await AttendanceSession.findAll({
        where: {
          session_id: { [Op.in]: sessionIds }
        }
      });
    }

    const attendanceSessionIds = attendanceSessions.map(as => as.attendance_session_id);

    let records = [];
    if (attendanceSessionIds.length > 0) {
      records = await AttendanceRecord.findAll({
        where: {
          attendance_session_id: { [Op.in]: attendanceSessionIds }
        },
        include: [{
          model: Student,
          as: 'student',
          include: [{
            model: User,
            as: 'user',
            attributes: ['full_name']
          }]
        }, {
          model: AttendanceSession,
          as: 'attendanceSession',
          include: [{
            model: Session,
            as: 'session',
            attributes: ['session_id', 'date', 'status']
          }]
        }]
      });
    }
    
    // Also need to calculate total sessions per student (including sessions without attendance records)
    // Get all enrolled students
    const enrollments = await Enrollment.findAll({
      where: { class_id: classId, status: 'ENROLLED' },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name']
        }]
      }]
    });
    
    // Calculate total sessions per student (FINISHED + ONGOING with attendance)
    const studentTotalSessions = new Map();
    enrollments.forEach(enrollment => {
      const studentId = enrollment.student_id;
      // Count FINISHED sessions
      const finishedCount = sessions.filter(s => s.status === 'FINISHED').length;
      // Count distinct ONGOING sessions where this student has attendance record
      const ongoingSessionIds = new Set();
      records.forEach(r => {
        if (r.student_id === studentId && 
            r.attendanceSession?.session?.status === 'ONGOING') {
          ongoingSessionIds.add(r.attendanceSession.session.session_id);
        }
      });
      studentTotalSessions.set(studentId, finishedCount + ongoingSessionIds.size);
    });

    // Calculate overview
    const total = records.length;
    const onTime = records.filter(r => r.status === 'PRESENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;

    // Group by student
    const studentMap = new Map();
    
    // Initialize all enrolled students
    enrollments.forEach(enrollment => {
      const studentId = enrollment.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_code: enrollment.student.student_code,
          full_name: enrollment.student.user.full_name,
          total: studentTotalSessions.get(studentId) || 0,
          onTime: 0,
          late: 0,
          absent: 0
        });
      }
    });
    
    // Count attendance records
    records.forEach(record => {
      const studentId = record.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_code: record.student.student_code,
          full_name: record.student.user.full_name,
          total: studentTotalSessions.get(studentId) || 0,
          onTime: 0,
          late: 0,
          absent: 0
        });
      }
      const student = studentMap.get(studentId);
      if (record.status === 'PRESENT') {
        student.onTime++;
      } else if (record.status === 'LATE') {
        student.late++;
      } else if (record.status === 'ABSENT') {
        student.absent++;
      }
    });

    const students = Array.from(studentMap.values()).map(s => ({
      student_id: s.student_id,
      student_code: s.student_code,
      full_name: s.full_name,
      total_sessions: s.total,
      on_time: s.onTime,
      late: s.late,
      absent: s.absent,
      attendance_rate: s.total > 0 ? ((s.onTime + s.late) / s.total * 100).toFixed(1) + '%' : '0%'
    }));

    res.json({
      success: true,
      data: {
        class: {
          class_id: classData.class_id,
          class_code: classData.class_code,
          name: classData.name,
          school_year: classData.school_year,
          semester: classData.semester
        },
        overview: {
          total_sessions: sessions.length,
          total_records: total,
          on_time: total > 0 ? Math.round((onTime / total) * 100) : 0,
          late: total > 0 ? Math.round((late / total) * 100) : 0,
          absent: total > 0 ? Math.round((absent / total) * 100) : 0,
          on_time_count: onTime,
          late_count: late,
          absent_count: absent
        },
        students
      }
    });
  } catch (error) {
    console.error('Get class report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const exportReport = async (req, res) => {
  try {
    // TODO: Implement export to Excel/PDF
    res.status(501).json({
      success: false,
      message: 'Export not implemented yet'
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAttendanceReport,
  getClassReport,
  exportReport
};

