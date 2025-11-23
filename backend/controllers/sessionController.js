const { Session, Class, SessionMaterial } = require('../models');

const getSessions = async (req, res) => {
  try {
    const { classId } = req.params;

    const sessions = await Session.findAll({
      where: { class_id: classId },
      include: [{
        model: SessionMaterial,
        as: 'materials'
      }],
      order: [['date', 'DESC']]
    });

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createSession = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date, start_time, end_time, room, topic } = req.body;

    if (!date || !start_time) {
      return res.status(400).json({
        success: false,
        message: 'Date and start_time are required'
      });
    }

    const session = await Session.create({
      class_id: classId,
      date,
      start_time,
      end_time,
      room,
      topic,
      status: 'ONGOING'
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    await session.update(updates);

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: session
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const startAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'QR', duration_minutes = 15, late_after_minutes = 15 } = req.body;

    const { AttendanceSession, QRToken } = require('../models');
    const { generateQRToken } = require('../utils/qrToken');

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const openAt = new Date();
    const closeAt = new Date(openAt.getTime() + duration_minutes * 60000);

    const attendanceSession = await AttendanceSession.create({
      session_id: id,
      method,
      open_at: openAt,
      close_at: closeAt,
      late_after_minutes
    });

    let qrToken = null;
    if (method === 'QR') {
      const token = generateQRToken();
      const expiresAt = closeAt;

      qrToken = await QRToken.create({
        attendance_session_id: attendanceSession.attendance_session_id,
        token,
        expires_at: expiresAt
      });
    }

    res.status(201).json({
      success: true,
      data: {
        attendance_session_id: attendanceSession.attendance_session_id,
        qr_token: qrToken?.token || null,
        expires_at: closeAt
      }
    });
  } catch (error) {
    console.error('Start attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getSessions,
  createSession,
  updateSession,
  startAttendance
};

