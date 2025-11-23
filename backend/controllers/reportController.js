const { AttendanceRecord, Student, User, Class, Session, AttendanceSession } = require('../models');
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
    const sessions = await Session.findAll({
      where: {
        class_id: { [Op.in]: classIds },
        status: 'FINISHED'
      }
    });

    const sessionIds = sessions.map(s => s.session_id);

    // Get attendance records
    const attendanceSessions = await AttendanceSession.findAll({
      where: {
        session_id: { [Op.in]: sessionIds }
      }
    });

    const attendanceSessionIds = attendanceSessions.map(as => as.attendance_session_id);

    const records = await AttendanceRecord.findAll({
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
          absent: total > 0 ? Math.round((absent / total) * 100) : 0
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
  exportReport
};

