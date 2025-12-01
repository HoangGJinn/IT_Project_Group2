const { QRToken, AttendanceSession, AttendanceRecord, Student, User, Session, Class } = require('../models');
const { Op } = require('sequelize');
const { isWithinRadius } = require('../utils/geolocation');

const scanQR = async (req, res) => {
  try {
    const { token, latitude, longitude } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Get student from authenticated user
    const student = await Student.findOne({ where: { user_id: req.user.user_id } });
    if (!student) {
      return res.status(403).json({
        success: false,
        message: 'User is not a student'
      });
    }

    const qrToken = await QRToken.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: new Date() }
      },
      include: [{
        model: AttendanceSession,
        as: 'attendanceSession',
        include: [{
          model: Session,
          as: 'session',
          include: [{
            model: Class,
            as: 'class'
          }]
        }]
      }]
    });

    if (!qrToken) {
      return res.status(400).json({
        success: false,
        message: 'Mã QR không hợp lệ hoặc đã hết hạn'
      });
    }

    // Check location if class has location set
    const classData = qrToken.attendanceSession.session.class;
    if (classData.latitude && classData.longitude) {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng bật định vị để điểm danh. Nếu bạn đang dùng máy tính, vui lòng sử dụng điện thoại để điểm danh chính xác hơn.'
        });
      }

      const radius = classData.location_radius || 100;
      const withinRadius = isWithinRadius(
        parseFloat(classData.latitude),
        parseFloat(classData.longitude),
        parseFloat(latitude),
        parseFloat(longitude),
        radius
      );

      if (!withinRadius) {
        return res.status(400).json({
          success: false,
          message: `Bạn không ở trong phạm vi lớp học. Vui lòng đến lớp để điểm danh (bán kính: ${radius}m). Nếu bạn đang dùng máy tính, vị trí có thể không chính xác - vui lòng sử dụng điện thoại.`
        });
      }
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
        student_id: studentId
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Đã điểm danh rồi'
      });
    }

    // Determine status
    const minutesLate = (now - openAt) / 60000;
    const status = minutesLate > lateAfter ? 'LATE' : 'PRESENT';

    const record = await AttendanceRecord.create({
      attendance_session_id: attendanceSessionId,
      student_id: studentId,
      checkin_time: now,
      status,
      source: 'QR',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    });

    res.json({
      success: true,
      message: 'Điểm danh thành công',
      data: {
        status,
        checkin_time: now,
        class_info: {
          class_id: qrToken.attendanceSession.session.class.class_id,
          class_code: qrToken.attendanceSession.session.class.class_code,
          name: qrToken.attendanceSession.session.class.name
        }
      }
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const records = await AttendanceRecord.findAll({
      where: { attendance_session_id: id },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email']
        }]
      }]
    });

    res.json({
      success: true,
      data: records.map(r => ({
        record_id: r.record_id,
        student: {
          student_id: r.student.student_id,
          student_code: r.student.student_code,
          full_name: r.student.user.full_name
        },
        status: r.status,
        checkin_time: r.checkin_time,
        source: r.source,
        latitude: r.latitude,
        longitude: r.longitude
      }))
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { recordId } = req.params;
    const { status, note } = req.body;

    const record = await AttendanceRecord.findByPk(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found'
      });
    }

    if (status) record.status = status;
    if (note) record.note = note;

    await record.save();

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: record
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  scanQR,
  getAttendance,
  updateAttendance
};

