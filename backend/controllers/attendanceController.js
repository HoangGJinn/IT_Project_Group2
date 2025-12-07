const {
  QRToken,
  AttendanceSession,
  AttendanceRecord,
  Student,
  User,
  Session,
  Class,
} = require('../models');
const { Op } = require('sequelize');
const { isWithinRadius } = require('../utils/geolocation');

const scanQR = async (req, res) => {
  try {
    const { token, latitude, longitude, no_gps_reason } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required',
      });
    }

    // Get student from authenticated user
    const student = await Student.findOne({ where: { user_id: req.user.user_id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'User is not a student',
      });
    }

    const qrToken = await QRToken.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: new Date() },
      },
      include: [
        {
          model: AttendanceSession,
          as: 'attendanceSession',
          include: [
            {
              model: Session,
              as: 'session',
              include: [
                {
                  model: Class,
                  as: 'class',
                },
              ],
            },
          ],
        },
      ],
    });

    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: 'Mã QR không hợp lệ hoặc đã hết hạn',
      });
    }

    // Check location - GPS is optional, but if not provided, reason is required
    const attendanceSession = qrToken.attendanceSession;
    const hasGPS = latitude && longitude;
    let withinRadius = false;
    let locationValid = false;

    if (hasGPS) {
      // Check if teacher location is set
      if (attendanceSession.teacher_latitude && attendanceSession.teacher_longitude) {
        // Check distance from teacher's location
        const radius = attendanceSession.location_radius || 10;
        withinRadius = isWithinRadius(
          parseFloat(attendanceSession.teacher_latitude),
          parseFloat(attendanceSession.teacher_longitude),
          parseFloat(latitude),
          parseFloat(longitude),
          radius
        );
        locationValid = withinRadius;
      } else {
        // Teacher location not set - cannot validate, set to pending review
        locationValid = false; // Will result in is_valid = null
      }
    } else {
      // No GPS - require reason
      if (!no_gps_reason || no_gps_reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'Vui lòng bật GPS để điểm danh hoặc cung cấp lý do hợp lệ khi không thể sử dụng GPS.',
        });
      }
      // If no GPS, set is_valid to NULL (pending teacher review)
      locationValid = false;
    }

    const studentId = student.student_id;

    const attendanceSessionId = qrToken.attendance_session_id;
    const now = new Date();
    const openAt = new Date(qrToken.attendanceSession.open_at);
    const lateAfter = qrToken.attendanceSession.late_after_minutes || 15;

    // Check if already checked in
    const existing = await AttendanceRecord.findOne({
      where: {
        attendance_session_id: attendanceSessionId,
        student_id: studentId,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Đã điểm danh rồi',
      });
    }

    // Determine status
    const minutesLate = (now - openAt) / 60000;
    const status = minutesLate > lateAfter ? 'LATE' : 'PRESENT';

    // Determine is_valid:
    // - 1: Has GPS, teacher location set, and within radius
    // - 0: Has GPS, teacher location set, but outside radius
    // - null: No GPS (pending review) OR teacher location not set (pending review)
    let isValidValue = null;
    if (hasGPS && attendanceSession.teacher_latitude && attendanceSession.teacher_longitude) {
      isValidValue = locationValid ? 1 : 0;
    } else {
      // No GPS or teacher location not set - pending review
      isValidValue = null;
    }

    const record = await AttendanceRecord.create({
      attendance_session_id: attendanceSessionId,
      student_id: studentId,
      checkin_time: now,
      status,
      source: 'QR',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      no_gps_reason: !hasGPS && no_gps_reason ? no_gps_reason.trim() : null,
      is_valid: isValidValue,
    });

    // Reload record to ensure we have the actual database value
    await record.reload();

    // Attendance record created successfully

    res.json({
      success: true,
      message: 'Điểm danh thành công',
      data: {
        status,
        checkin_time: now,
        is_valid: record.is_valid, // Use the actual database value
        no_gps_reason: record.no_gps_reason,
        latitude: record.latitude,
        longitude: record.longitude,
        class_info: {
          class_id: qrToken.attendanceSession.session.class.class_id,
          class_code: qrToken.attendanceSession.session.class.class_code,
          name: qrToken.attendanceSession.session.class.name,
        },
      },
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const records = await AttendanceRecord.findAll({
      where: { attendance_session_id: id },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name', 'email'],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      data: records.map(r => {
        // Ensure is_valid is properly converted (could be 1, 0, or null)
        const isValidValue = r.is_valid === null ? null : r.is_valid === 1 ? 1 : 0;
        return {
          record_id: r.record_id,
          student: {
            student_id: r.student.student_id,
            student_code: r.student.student_code,
            full_name: r.student.user.full_name,
          },
          status: r.status,
          checkin_time: r.checkin_time,
          source: r.source,
          latitude: r.latitude,
          longitude: r.longitude,
          no_gps_reason: r.no_gps_reason,
          is_valid: isValidValue, // Ensure consistent value
        };
      }),
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { status, note, is_valid } = req.body;

    const record = await AttendanceRecord.findByPk(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
      });
    }

    if (status) record.status = status;
    if (note !== undefined) record.note = note;
    if (is_valid !== undefined) {
      // Allow setting to 1 (valid), 0 (invalid), or null (pending)
      record.is_valid = is_valid === null ? null : is_valid ? 1 : 0;
    }

    await record.save();

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: record,
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  scanQR,
  getAttendance,
  updateAttendance,
};
