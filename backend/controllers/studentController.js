const { Enrollment, Class, Course, Teacher, User, Student, Session, AttendanceRecord, AttendanceSession, QRToken } = require('../models');
const { Op } = require('sequelize');

const getClasses = async (req, res) => {
  try {
    const { school_year, semester } = req.query;
    
    const student = await Student.findOne({ where: { user_id: req.user.user_id } });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'User is not a student'
      });
    }

    const where = { 
      student_id: student.student_id,
      status: 'ENROLLED' 
    };

    const classWhere = {};
    if (school_year) {
      classWhere.school_year = school_year;
    }
    if (semester) {
      classWhere.semester = semester;
    }

    let enrollments;
    try {
      enrollments = await Enrollment.findAll({
        where,
        include: [{
          model: Class,
          as: 'class',
          where: Object.keys(classWhere).length > 0 ? classWhere : undefined,
          required: true,
          attributes: {
            exclude: ['image_url'] // Exclude image_url if column doesn't exist
          },
          include: [
            {
              model: Course,
              as: 'course',
              attributes: ['course_id', 'name'],
              required: false
            },
            {
              model: Teacher,
              as: 'teacher',
              required: false,
              include: [{
                model: User,
                as: 'user',
                attributes: ['user_id', 'full_name'],
                required: false
              }]
            }
          ]
        }]
      });
    } catch (queryError) {
      console.error('Enrollment query error:', queryError);
      throw queryError;
    }

    // Calculate attendance stats
    const classesWithStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        if (!enrollment.class) {
          console.warn('Enrollment missing class:', enrollment.enrollment_id);
          return null;
        }

        const classId = enrollment.class.class_id;
        let totalSessions = 0;
        let attendedSessions = 0;

        try {
          totalSessions = await Session.count({
            where: { class_id: classId, status: 'FINISHED' }
          });

          // Count attended sessions for this class
          const attendanceRecords = await AttendanceRecord.findAll({
            where: {
              student_id: student.student_id,
              status: { [Op.in]: ['PRESENT', 'LATE'] }
            },
            include: [{
              model: AttendanceSession,
              as: 'attendanceSession',
              required: true,
              include: [{
                model: Session,
                as: 'session',
                required: true,
                where: { class_id: classId }
              }]
            }]
          });
          attendedSessions = attendanceRecords.length;
        } catch (statsError) {
          console.error('Error calculating stats for class:', classId, statsError);
          // Continue with 0 values
        }

        const attendanceRate = totalSessions > 0
          ? ((attendedSessions / totalSessions) * 100).toFixed(1) + '%'
          : '0%';

        return {
          class_id: enrollment.class.class_id,
          class_code: enrollment.class.class_code,
          name: enrollment.class.name || enrollment.class.course?.name || 'N/A',
          course: enrollment.class.course ? {
            name: enrollment.class.course.name
          } : null,
          image_url: null, // Will be added when database column exists
          school_year: enrollment.class.school_year,
          semester: enrollment.class.semester,
          schedule_days: enrollment.class.schedule_days,
          schedule_periods: enrollment.class.schedule_periods,
          room: enrollment.class.room,
          teacher: enrollment.class.teacher?.user ? {
            full_name: enrollment.class.teacher.user.full_name
          } : null,
          attendance_rate: attendanceRate,
          total_sessions: totalSessions,
          attended_sessions: attendedSessions
        };
      })
    );

    // Filter out null values
    const validClasses = classesWithStats.filter(c => c !== null);

    res.json({
      success: true,
      data: validClasses
    });
  } catch (error) {
    console.error('Get student classes error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findOne({ where: { user_id: req.user.user_id } });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      where: { class_id: id, student_id: student.student_id }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'Not enrolled in this class'
      });
    }

    const classData = await Class.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course'
        },
        {
          model: Teacher,
          as: 'teacher',
          include: [{
            model: User,
            as: 'user'
          }]
        }
      ]
    });

    // Get attendance stats
    const totalSessions = await Session.count({
      where: { class_id: id, status: 'FINISHED' }
    });

    // Count attended sessions for this class
    const attendanceRecords = await AttendanceRecord.findAll({
      where: {
        student_id: student.student_id,
        status: { [Op.in]: ['PRESENT', 'LATE'] }
      },
      include: [{
        model: AttendanceSession,
        as: 'attendanceSession',
        required: true,
        include: [{
          model: Session,
          as: 'session',
          required: true,
          where: { class_id: id }
        }]
      }]
    });
    const attendedSessions = attendanceRecords.length;

    const attendanceRate = totalSessions > 0
      ? ((attendedSessions / totalSessions) * 100).toFixed(1) + '%'
      : '0%';

    // Get sessions with QR token info and attendance records
    const sessions = await Session.findAll({
      where: { class_id: id },
      include: [{
        model: AttendanceSession,
        as: 'attendanceSession',
        required: false,
        include: [{
          model: QRToken,
          as: 'qrToken',
          required: false
        }, {
          model: AttendanceRecord,
          as: 'attendanceRecords',
          required: false,
          where: { student_id: student.student_id }
        }]
      }],
      order: [['date', 'DESC']]
    });

    // Format sessions with QR info and attendance status
    const formattedSessions = sessions.map(session => {
      const sessionData = session.toJSON();
      if (sessionData.attendanceSession?.qrToken) {
        sessionData.hasQR = true;
        sessionData.qrToken = sessionData.attendanceSession.qrToken.token;
        sessionData.qrExpiresAt = sessionData.attendanceSession.qrToken.expires_at;
        sessionData.qrExpired = new Date(sessionData.attendanceSession.qrToken.expires_at) < new Date();
      } else {
        sessionData.hasQR = false;
      }
      // Check if student has already checked in
      if (sessionData.attendanceSession?.attendanceRecords && sessionData.attendanceSession.attendanceRecords.length > 0) {
        const record = sessionData.attendanceSession.attendanceRecords[0];
        sessionData.attendanceStatus = record.status;
        sessionData.attendanceTime = record.checkin_time;
        sessionData.hasAttended = true;
      } else {
        sessionData.hasAttended = false;
        sessionData.attendanceStatus = null;
      }
      return sessionData;
    });

    res.json({
      success: true,
      data: {
        ...classData.toJSON(),
        attendance_stats: {
          total_sessions: totalSessions,
          attended_sessions: attendedSessions,
          attendance_rate: attendanceRate
        },
        sessions: formattedSessions
      }
    });
  } catch (error) {
    console.error('Get student class by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const { class_id, status, start_date, end_date } = req.query;
    
    const student = await Student.findOne({ where: { user_id: req.user.user_id } });

    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'User is not a student'
      });
    }

    const where = { student_id: student.student_id };
    if (status) where.status = status;

    // Build session where clause
    const sessionWhere = {};
    if (class_id) {
      sessionWhere.class_id = class_id;
    }

    let records;
    try {
      records = await AttendanceRecord.findAll({
        where,
        include: [{
          model: AttendanceSession,
          as: 'attendanceSession',
          required: true,
          include: [{
            model: Session,
            as: 'session',
            required: true,
            where: Object.keys(sessionWhere).length > 0 ? sessionWhere : undefined,
            include: [{
              model: Class,
              as: 'class',
              required: true,
              attributes: ['class_id', 'class_code', 'name']
            }]
          }]
        }],
        order: [['checkin_time', 'DESC']]
      });
    } catch (queryError) {
      console.error('AttendanceRecord query error:', queryError);
      throw queryError;
    }

    // Calculate stats
    const stats = {
      total: records.length,
      on_time: records.filter(r => r.status === 'PRESENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      absent: records.filter(r => r.status === 'ABSENT').length
    };

    // Map records safely
    const mappedRecords = records.map(r => {
      try {
        const session = r.attendanceSession?.session;
        const classData = session?.class;
        
        if (!session || !classData) {
          console.warn('Record missing session or class:', r.record_id);
          return null;
        }

        return {
          attendance_record_id: r.record_id,
          class: {
            class_id: classData.class_id,
            class_code: classData.class_code,
            name: classData.name || classData.course?.name
          },
          session: {
            session_id: session.session_id,
            date: session.date,
            time: session.start_time,
            room: session.room
          },
          status: r.status,
          attendance_time: r.checkin_time || r.attendance_time
        };
      } catch (mapError) {
        console.error('Error mapping record:', r.record_id, mapError);
        return null;
      }
    }).filter(r => r !== null);

    res.json({
      success: true,
      stats,
      data: mappedRecords
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ 
      where: { user_id: req.user.user_id },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password_hash'] }
      }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: {
        student_id: student.student_id,
        student_code: student.student_code,
        user: {
          user_id: student.user.user_id,
          email: student.user.email,
          full_name: student.user.full_name,
          phone: student.user.phone,
          image_url: student.user.image_url
        }
      }
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getClasses,
  getClassById,
  getAttendanceHistory,
  getProfile
};

