const {
  AttendanceRecord,
  Student,
  User,
  Class,
  Session,
  AttendanceSession,
  Enrollment,
} = require('../models');
const { Op } = require('sequelize');

const getAttendanceReport = async (req, res) => {
  try {
    const { school_year, semester, course_id } = req.query;

    if (!school_year || !semester) {
      return res.status(400).json({
        success: false,
        message: 'school_year and semester are required',
      });
    }

    // Get classes
    const where = { school_year, semester };
    if (course_id) where.course_id = course_id;

    const classes = await Class.findAll({ where });
    const classIds = classes.map(c => c.class_id);

    // Get all FINISHED sessions for these classes (to match getClassReport logic)
    let sessions = [];
    if (classIds.length > 0) {
      sessions = await Session.findAll({
        where: {
          class_id: { [Op.in]: classIds },
          status: 'FINISHED',
        },
      });
    }

    // Calculate total finished sessions per class
    const classSessionCount = new Map();
    sessions.forEach(session => {
      const classId = session.class_id;
      classSessionCount.set(classId, (classSessionCount.get(classId) || 0) + 1);
    });

    const totalFinishedSessions = sessions.length;
    const sessionIds = sessions.map(s => s.session_id);

    // Get attendance records
    let attendanceSessions = [];
    if (sessionIds.length > 0) {
      attendanceSessions = await AttendanceSession.findAll({
        where: {
          session_id: { [Op.in]: sessionIds },
        },
      });
    }

    const attendanceSessionIds = attendanceSessions.map(as => as.attendance_session_id);

    let records = [];
    if (attendanceSessionIds.length > 0) {
      records = await AttendanceRecord.findAll({
        where: {
          attendance_session_id: { [Op.in]: attendanceSessionIds },
        },
        include: [
          {
            model: Student,
            as: 'student',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['full_name'],
              },
            ],
          },
        ],
      });
    }

    // Get all enrolled students across all classes
    const enrollments = await Enrollment.findAll({
      where: { class_id: { [Op.in]: classIds }, status: 'ENROLLED' },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name'],
            },
          ],
        },
      ],
    });

    // Calculate total sessions per student based on their class (only FINISHED sessions)
    const studentTotalSessions = new Map();
    enrollments.forEach(enrollment => {
      const studentId = enrollment.student_id;
      const classId = enrollment.class_id;
      // Get the number of finished sessions for this student's class
      const classSessions = classSessionCount.get(classId) || 0;
      studentTotalSessions.set(studentId, classSessions);
    });

    // Filter only PRESENT and LATE records (to match getClassReport logic)
    const attendanceRecords = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
    const totalRecords = attendanceRecords.length;
    const onTime = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const late = attendanceRecords.filter(r => r.status === 'LATE').length;

    // Calculate absent: totalPossibleAttendances - totalAttended
    // Total possible attendances = sum of (finished sessions per class * students in that class)
    let totalPossibleAttendances = 0;
    const classStudentCount = new Map();
    enrollments.forEach(enrollment => {
      const classId = enrollment.class_id;
      classStudentCount.set(classId, (classStudentCount.get(classId) || 0) + 1);
    });
    classStudentCount.forEach((studentCount, classId) => {
      const classSessions = classSessionCount.get(classId) || 0;
      totalPossibleAttendances += classSessions * studentCount;
    });
    const totalAttended = onTime + late;
    const absent = Math.max(0, totalPossibleAttendances - totalAttended);

    // Calculate validation stats (from all attendance records)
    const validRecords = attendanceRecords.filter(r => r.is_valid === 1).length;
    const invalidRecords = attendanceRecords.filter(r => r.is_valid === 0).length;
    const pendingRecords = attendanceRecords.filter(r => r.is_valid === null).length;
    const recordsWithValidation = attendanceRecords.filter(r => r.is_valid !== null).length;

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
          valid: 0,
          invalid: 0,
          pending: 0,
        });
      }
    });

    // Count attendance records (only PRESENT and LATE, to match getClassReport)
    attendanceRecords.forEach(record => {
      const studentId = record.student_id;
      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_code: record.student.student_code,
          full_name: record.student.user.full_name,
          total: studentTotalSessions.get(studentId) || 0,
          onTime: 0,
          late: 0,
          valid: 0,
          invalid: 0,
          pending: 0,
        });
      }
      const student = studentMap.get(studentId);
      if (record.status === 'PRESENT') {
        student.onTime++;
      } else if (record.status === 'LATE') {
        student.late++;
      }
      // Count validation status
      if (record.is_valid === 1) {
        student.valid++;
      } else if (record.is_valid === 0) {
        student.invalid++;
      } else if (record.is_valid === null) {
        student.pending++;
      }
    });

    const students = Array.from(studentMap.values()).map(s => {
      const attended = s.onTime + s.late;
      // Ensure absent count is never negative
      const absentCount = Math.max(0, s.total - attended);
      return {
        student_id: s.student_id,
        student_code: s.student_code,
        full_name: s.full_name,
        total_sessions: s.total,
        attendance_rate: s.total > 0 ? ((attended / s.total) * 100).toFixed(1) + '%' : '0%',
        valid_count: s.valid,
        invalid_count: s.invalid,
        pending_count: s.pending,
        valid_rate: attended > 0 ? ((s.valid / attended) * 100).toFixed(1) + '%' : '0%',
        invalid_rate: attended > 0 ? ((s.invalid / attended) * 100).toFixed(1) + '%' : '0%',
      };
    });

    res.json({
      success: true,
      data: {
        overview: {
          total_sessions: totalFinishedSessions,
          total_records: totalRecords,
          on_time:
            totalPossibleAttendances > 0
              ? Math.round((onTime / totalPossibleAttendances) * 100)
              : 0,
          late:
            totalPossibleAttendances > 0 ? Math.round((late / totalPossibleAttendances) * 100) : 0,
          absent:
            totalPossibleAttendances > 0
              ? Math.round((absent / totalPossibleAttendances) * 100)
              : 0,
          on_time_count: onTime,
          late_count: late,
          absent_count: absent,
          valid:
            recordsWithValidation > 0
              ? Math.round((validRecords / recordsWithValidation) * 100)
              : 0,
          invalid:
            recordsWithValidation > 0
              ? Math.round((invalidRecords / recordsWithValidation) * 100)
              : 0,
          pending: totalRecords > 0 ? Math.round((pendingRecords / totalRecords) * 100) : 0,
          valid_count: validRecords,
          invalid_count: invalidRecords,
          pending_count: pendingRecords,
        },
        students,
      },
    });
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
        message: 'Class not found',
      });
    }

    // Get all sessions for this class (both FINISHED and ONGOING)
    // We need ONGOING to get attendance records, but total sessions should only count FINISHED
    const allSessions = await Session.findAll({
      where: {
        class_id: classId,
        status: { [Op.in]: ['FINISHED', 'ONGOING'] },
      },
      order: [['date', 'ASC']],
    });

    // Only FINISHED sessions count for total sessions (to match student view)
    const finishedSessions = allSessions.filter(s => s.status === 'FINISHED');
    const totalFinishedSessions = finishedSessions.length;

    const sessionIds = allSessions.map(s => s.session_id);

    // Get attendance records from both FINISHED and ONGOING sessions
    let attendanceSessions = [];
    if (sessionIds.length > 0) {
      attendanceSessions = await AttendanceSession.findAll({
        where: {
          session_id: { [Op.in]: sessionIds },
        },
      });
    }

    const attendanceSessionIds = attendanceSessions.map(as => as.attendance_session_id);

    let allRecords = [];
    if (attendanceSessionIds.length > 0) {
      allRecords = await AttendanceRecord.findAll({
        where: {
          attendance_session_id: { [Op.in]: attendanceSessionIds },
        },
        include: [
          {
            model: Student,
            as: 'student',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['full_name'],
              },
            ],
          },
          {
            model: AttendanceSession,
            as: 'attendanceSession',
            include: [
              {
                model: Session,
                as: 'session',
                attributes: ['session_id', 'date', 'status'],
              },
            ],
          },
        ],
      });
    }

    // Filter records to only include FINISHED sessions for statistics
    // Only FINISHED sessions should be counted in the report to match the total sessions count
    const records = allRecords.filter(r => {
      const sessionStatus = r.attendanceSession?.session?.status;
      // Only include FINISHED sessions for report statistics
      return sessionStatus === 'FINISHED';
    });

    // Get all enrolled students
    const enrollments = await Enrollment.findAll({
      where: { class_id: classId, status: 'ENROLLED' },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name'],
            },
          ],
        },
      ],
    });

    // Calculate total sessions per student (only FINISHED sessions, to match student view)
    const studentTotalSessions = new Map();
    enrollments.forEach(enrollment => {
      const studentId = enrollment.student_id;
      // Only count FINISHED sessions (to match student view calculation)
      studentTotalSessions.set(studentId, totalFinishedSessions);
    });

    // Calculate overview - count attendance from FINISHED sessions only
    // (to match the total sessions count which only includes FINISHED sessions)
    const allAttendanceRecords = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
    const totalRecords = allAttendanceRecords.length;
    const onTime = allAttendanceRecords.filter(r => r.status === 'PRESENT').length;
    const late = allAttendanceRecords.filter(r => r.status === 'LATE').length;
    // Absent is calculated as: total possible attendances (FINISHED only) - actual attendances
    const totalStudents = enrollments.length;
    const totalPossibleAttendances = totalFinishedSessions * totalStudents;
    const totalAttended = onTime + late;
    const absent = Math.max(0, totalPossibleAttendances - totalAttended);

    // Calculate validation stats (from all attendance records)
    const validRecords = allAttendanceRecords.filter(r => r.is_valid === 1).length;
    const invalidRecords = allAttendanceRecords.filter(r => r.is_valid === 0).length;
    const pendingRecords = allAttendanceRecords.filter(r => r.is_valid === null).length;
    const recordsWithValidation = allAttendanceRecords.filter(r => r.is_valid !== null).length;

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
          valid: 0,
          invalid: 0,
          pending: 0,
        });
      }
    });

    // Count attendance records from FINISHED sessions only
    // (to match the total sessions count which only includes FINISHED sessions)
    records.forEach(record => {
      const studentId = record.student_id;
      // Only count PRESENT and LATE records from FINISHED sessions
      if (record.status !== 'PRESENT' && record.status !== 'LATE') {
        return;
      }

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student_id: studentId,
          student_code: record.student.student_code,
          full_name: record.student.user.full_name,
          total: studentTotalSessions.get(studentId) || 0,
          onTime: 0,
          late: 0,
          valid: 0,
          invalid: 0,
          pending: 0,
        });
      }
      const student = studentMap.get(studentId);
      if (record.status === 'PRESENT') {
        student.onTime++;
      } else if (record.status === 'LATE') {
        student.late++;
      }
      // Count validation status
      if (record.is_valid === 1) {
        student.valid++;
      } else if (record.is_valid === 0) {
        student.invalid++;
      } else if (record.is_valid === null) {
        student.pending++;
      }
    });

    const students = Array.from(studentMap.values()).map(s => {
      const attended = s.onTime + s.late;
      // Absent = total sessions (FINISHED only) - attended sessions (FINISHED only)
      // Ensure absent count is never negative
      const absentCount = Math.max(0, s.total - attended);
      return {
        student_id: s.student_id,
        student_code: s.student_code,
        full_name: s.full_name,
        total_sessions: s.total,
        on_time: s.onTime,
        late: s.late,
        absent: absentCount,
        attendance_rate: s.total > 0 ? ((attended / s.total) * 100).toFixed(1) + '%' : '0%',
        valid_count: s.valid,
        invalid_count: s.invalid,
        pending_count: s.pending,
        valid_rate: attended > 0 ? ((s.valid / attended) * 100).toFixed(1) + '%' : '0%',
        invalid_rate: attended > 0 ? ((s.invalid / attended) * 100).toFixed(1) + '%' : '0%',
      };
    });

    res.json({
      success: true,
      data: {
        class: {
          class_id: classData.class_id,
          class_code: classData.class_code,
          name: classData.name,
          school_year: classData.school_year,
          semester: classData.semester,
        },
        overview: {
          total_sessions: totalFinishedSessions,
          total_records: totalRecords,
          on_time:
            totalPossibleAttendances > 0
              ? Math.round((onTime / totalPossibleAttendances) * 100)
              : 0,
          late:
            totalPossibleAttendances > 0 ? Math.round((late / totalPossibleAttendances) * 100) : 0,
          absent:
            totalPossibleAttendances > 0
              ? Math.round((absent / totalPossibleAttendances) * 100)
              : 0,
          on_time_count: onTime,
          late_count: late,
          absent_count: absent,
          valid:
            recordsWithValidation > 0
              ? Math.round((validRecords / recordsWithValidation) * 100)
              : 0,
          invalid:
            recordsWithValidation > 0
              ? Math.round((invalidRecords / recordsWithValidation) * 100)
              : 0,
          pending: totalRecords > 0 ? Math.round((pendingRecords / totalRecords) * 100) : 0,
          valid_count: validRecords,
          invalid_count: invalidRecords,
          pending_count: pendingRecords,
        },
        students,
      },
    });
  } catch (error) {
    console.error('Get class report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const exportReport = async (req, res) => {
  try {
    // TODO: Implement export to Excel/PDF
    res.status(501).json({
      success: false,
      message: 'Export not implemented yet',
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getAttendanceReport,
  getClassReport,
  exportReport,
};
