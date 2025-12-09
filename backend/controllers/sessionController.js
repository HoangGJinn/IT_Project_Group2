const { Session, SessionMaterial, AttendanceSession, QRToken } = require('../models');

const getSessions = async (req, res) => {
  try {
    const { classId } = req.params;

    const sessions = await Session.findAll({
      where: { class_id: classId },
      include: [
        {
          model: SessionMaterial,
          as: 'materials',
        },
        {
          model: AttendanceSession,
          as: 'attendanceSession',
          required: false,
          include: [
            {
              model: QRToken,
              as: 'qrToken',
              required: false,
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
    });

    // Use current timestamp (UTC milliseconds) for consistent timezone handling
    const nowTimestamp = Date.now();

    // Format sessions with attendance info and calculate real-time status
    const formattedSessions = await Promise.all(
      sessions.map(async session => {
        const sessionData = session.toJSON();

        // Calculate real-time status based on current time
        // Parse date string (YYYY-MM-DD) and time string (HH:mm:ss) to create Date object
        // Use UTC to avoid timezone issues when deployed
        const dateStr = sessionData.date; // Format: YYYY-MM-DD
        const [startHour, startMinute] = sessionData.start_time.split(':').map(Number);

        // Create UTC date for session start time
        const [year, month, day] = dateStr.split('-').map(Number);
        const sessionStartTime = new Date(
          Date.UTC(year, month - 1, day, startHour, startMinute, 0)
        );

        // Calculate end time
        let sessionEndTime = null;
        if (sessionData.end_time) {
          const [endHour, endMinute] = sessionData.end_time.split(':').map(Number);
          sessionEndTime = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0));
        } else {
          // Default to 90 minutes if no end_time
          sessionEndTime = new Date(sessionStartTime);
          sessionEndTime.setUTCMinutes(sessionEndTime.getUTCMinutes() + 90);
        }

        // Determine real-time status first
        let realTimeStatus = sessionData.status;
        if (sessionData.status !== 'CANCELLED') {
          if (nowTimestamp < sessionStartTime.getTime()) {
            realTimeStatus = 'UPCOMING'; // Chưa đến giờ
          } else if (
            nowTimestamp >= sessionStartTime.getTime() &&
            (!sessionEndTime || nowTimestamp < sessionEndTime.getTime())
          ) {
            realTimeStatus = 'ONGOING'; // Đang diễn ra
          } else if (sessionEndTime && nowTimestamp >= sessionEndTime.getTime()) {
            realTimeStatus = 'FINISHED'; // Đã kết thúc
          }
        }

        // Tự động cập nhật status trong database dựa trên realTimeStatus
        if (sessionData.status !== 'CANCELLED') {
          // Tự động chuyển sang ONGOING nếu đã đến giờ và status vẫn là UPCOMING
          if (realTimeStatus === 'ONGOING' && sessionData.status !== 'ONGOING') {
            await session.update({ status: 'ONGOING' });
            sessionData.status = 'ONGOING';
          }
          // Tự động chuyển sang FINISHED nếu đã hết thời gian
          if (realTimeStatus === 'FINISHED' && sessionData.status !== 'FINISHED') {
            await session.update({ status: 'FINISHED' });
            sessionData.status = 'FINISHED';
          }
        }

        sessionData.realTimeStatus = realTimeStatus;
        // Cho phép bắt đầu lớp nếu chưa đến giờ và status chưa phải ONGOING hoặc FINISHED
        sessionData.canStartSession =
          realTimeStatus === 'UPCOMING' &&
          sessionData.status !== 'ONGOING' &&
          sessionData.status !== 'FINISHED';
        // Cho phép tạo QR khi đã đến giờ (realTimeStatus = ONGOING) và chưa hết giờ
        // Không cần check status === 'ONGOING' vì có thể session chưa được start thủ công
        sessionData.canStartAttendance =
          realTimeStatus === 'ONGOING' &&
          (!sessionEndTime || nowTimestamp < sessionEndTime.getTime());

        if (sessionData.attendanceSession) {
          sessionData.hasAttendance = true;
          sessionData.attendanceSessionId = sessionData.attendanceSession.attendance_session_id;
          sessionData.hasQR = !!sessionData.attendanceSession.qrToken;
          if (sessionData.attendanceSession.qrToken) {
            sessionData.qrToken = sessionData.attendanceSession.qrToken.token;
            sessionData.qrExpiresAt = sessionData.attendanceSession.qrToken.expires_at;
            sessionData.qrExpired =
              new Date(sessionData.attendanceSession.qrToken.expires_at) < new Date();
          }
          sessionData.attendanceCloseAt = sessionData.attendanceSession.close_at;
          // Include GPS location info
          sessionData.teacherLatitude = sessionData.attendanceSession.teacher_latitude;
          sessionData.teacherLongitude = sessionData.attendanceSession.teacher_longitude;
          sessionData.locationRadius = sessionData.attendanceSession.location_radius;
        } else {
          sessionData.hasAttendance = false;
          sessionData.hasQR = false;
        }
        return sessionData;
      })
    );

    res.json({
      success: true,
      data: formattedSessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
        message: 'Date and start_time are required',
      });
    }

    const session = await Session.create({
      class_id: classId,
      date,
      start_time,
      end_time,
      room,
      topic,
      status: 'ONGOING',
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time, room, topic } = req.body;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if date/time conflicts with existing session (only if date or time is being changed)
    const checkDate = date || session.date;
    const checkStartTime = start_time || session.start_time;
    const checkEndTime = end_time !== undefined ? end_time || null : session.end_time;

    // Only check conflict if date or time is being changed
    if (
      (date && date !== session.date) ||
      (start_time && start_time !== session.start_time) ||
      (end_time !== undefined && end_time !== session.end_time)
    ) {
      const { Op } = require('sequelize');

      // Find sessions on the same date
      const existingSessions = await Session.findAll({
        where: {
          class_id: session.class_id,
          date: checkDate,
          session_id: { [Op.ne]: id },
          status: { [Op.ne]: 'CANCELLED' }, // Ignore cancelled sessions
        },
      });

      // Check for time overlap
      for (const existing of existingSessions) {
        const existingStart = existing.start_time;
        const existingEnd =
          existing.end_time ||
          (() => {
            // If no end_time, calculate default 90 minutes
            const [h, m] = existingStart.split(':').map(Number);
            const end = new Date();
            end.setHours(h, m + 90, 0, 0);
            return `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}:00`;
          })();

        // Check if times overlap
        const newStart = checkStartTime;
        const newEnd =
          checkEndTime ||
          (() => {
            const [h, m] = newStart.split(':').map(Number);
            const end = new Date();
            end.setHours(h, m + 90, 0, 0);
            return `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}:00`;
          })();

        // Convert times to minutes for easier comparison
        const timeToMinutes = timeStr => {
          const [h, m] = timeStr.split(':').map(Number);
          return h * 60 + m;
        };

        const existingStartMin = timeToMinutes(existingStart);
        const existingEndMin = timeToMinutes(existingEnd);
        const newStartMin = timeToMinutes(newStart);
        const newEndMin = timeToMinutes(newEnd);

        // Check for overlap: new session starts before existing ends AND new session ends after existing starts
        if (newStartMin < existingEndMin && newEndMin > existingStartMin) {
          return res.status(400).json({
            success: false,
            message: `Đã có buổi học khác trong cùng thời gian (${existingStart}${existingEnd !== existingStart ? ` - ${existingEnd}` : ''}). Vui lòng chọn thời gian khác.`,
          });
        }
      }
    }

    // Prepare update object with only valid fields
    const updates = {};
    if (date) updates.date = date;
    if (start_time) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time || null;
    if (room !== undefined) updates.room = room || null;
    if (topic !== undefined) updates.topic = topic || null;

    await session.update(updates);

    res.json({
      success: true,
      message: 'Cập nhật buổi học thành công',
      data: session,
    });
  } catch (error) {
    console.error('Update session error:', error);

    // Handle unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Get session again to check overlap
      const { id: sessionId } = req.params;
      const { date: reqDate, start_time: reqStartTime, end_time: reqEndTime } = req.body;
      const sessionForCheck = await Session.findByPk(sessionId);
      if (sessionForCheck) {
        // Check if it's the date constraint - if so, check for time overlap
        if (error.errors && error.errors.some(e => e.path === 'date' || e.path.includes('date'))) {
          // Re-check with time overlap logic
          const checkDate = reqDate || sessionForCheck.date;
          const checkStartTime = reqStartTime || sessionForCheck.start_time;
          const checkEndTime =
            reqEndTime !== undefined ? reqEndTime || null : sessionForCheck.end_time;

          const { Op } = require('sequelize');
          const existingSessions = await Session.findAll({
            where: {
              class_id: sessionForCheck.class_id,
              date: checkDate,
              session_id: { [Op.ne]: sessionId },
              status: { [Op.ne]: 'CANCELLED' },
            },
          });

          // If there are existing sessions, check time overlap
          if (existingSessions.length > 0) {
            for (const existing of existingSessions) {
              const existingStart = existing.start_time;
              const existingEnd =
                existing.end_time ||
                (() => {
                  const [h, m] = existingStart.split(':').map(Number);
                  const end = new Date();
                  end.setHours(h, m + 90, 0, 0);
                  return `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}:00`;
                })();

              const newStart = checkStartTime;
              const newEnd =
                checkEndTime ||
                (() => {
                  const [h, m] = newStart.split(':').map(Number);
                  const end = new Date();
                  end.setHours(h, m + 90, 0, 0);
                  return `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}:00`;
                })();

              const timeToMinutes = timeStr => {
                const [h, m] = timeStr.split(':').map(Number);
                return h * 60 + m;
              };

              const existingStartMin = timeToMinutes(existingStart);
              const existingEndMin = timeToMinutes(existingEnd);
              const newStartMin = timeToMinutes(newStart);
              const newEndMin = timeToMinutes(newEnd);

              if (newStartMin < existingEndMin && newEndMin > existingStartMin) {
                return res.status(400).json({
                  success: false,
                  message: `Đã có buổi học khác trong cùng thời gian (${existingStart}${existingEnd !== existingStart ? ` - ${existingEnd}` : ''}). Vui lòng chọn thời gian khác.`,
                });
              }
            }
          }

          // If no time overlap, it's just the unique constraint - allow it by removing the constraint check
          // Actually, we should remove the unique constraint from database, but for now, just allow update
          // by catching and ignoring this specific case
          return res.status(400).json({
            success: false,
            message:
              'Có thể có nhiều buổi học trong cùng ngày nếu khác giờ. Vui lòng kiểm tra lại thời gian.',
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Đã có buổi học khác trong ngày này. Vui lòng chọn ngày khác.',
      });
    }

    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors.map(e => e.message).join(', '),
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

const startSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session can be started
    const nowTimestamp = Date.now();
    // Parse date string (YYYY-MM-DD) and time string (HH:mm:ss) to create Date object
    // Use UTC to avoid timezone issues when deployed
    const dateStr = session.date; // Format: YYYY-MM-DD
    const [startHour, startMinute] = session.start_time.split(':').map(Number);
    const [year, month, day] = dateStr.split('-').map(Number);
    const sessionStartTime = new Date(Date.UTC(year, month - 1, day, startHour, startMinute, 0));

    // Calculate end time
    let sessionEndTime = null;
    if (session.end_time) {
      const [endHour, endMinute] = session.end_time.split(':').map(Number);
      sessionEndTime = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0));
    } else {
      sessionEndTime = new Date(sessionStartTime);
      sessionEndTime.setUTCMinutes(sessionEndTime.getUTCMinutes() + 90);
    }

    // Chỉ cho phép bắt đầu nếu chưa đến giờ và chưa bắt đầu
    if (nowTimestamp >= sessionStartTime.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Buổi học đã đến giờ, không thể bắt đầu sớm',
      });
    }

    if (session.status === 'ONGOING') {
      return res.status(400).json({
        success: false,
        message: 'Buổi học đã được bắt đầu',
      });
    }

    if (session.status === 'FINISHED' || session.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Không thể bắt đầu buổi học đã kết thúc hoặc đã hủy',
      });
    }

    // Cập nhật status sang ONGOING
    await session.update({ status: 'ONGOING' });

    res.json({
      success: true,
      message: 'Buổi học đã được bắt đầu',
      data: session,
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const startAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      method = 'QR',
      late_after_minutes = 15,
      latitude,
      longitude,
      location_radius = 10,
    } = req.body;

    const { AttendanceSession, QRToken } = require('../models');
    const { generateQRToken } = require('../utils/qrToken');

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Chỉ cho phép tạo QR khi lớp đã bắt đầu (status = ONGOING)
    if (session.status !== 'ONGOING') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng bắt đầu lớp học trước khi tạo QR điểm danh',
      });
    }

    // Check if session has ended
    const nowTimestamp = Date.now();
    // Parse date string (YYYY-MM-DD) and time string (HH:mm:ss) to create Date object
    // Use UTC to avoid timezone issues when deployed
    const dateStr = session.date; // Format: YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    let sessionEndTime = null;
    if (session.end_time) {
      const [endHour, endMinute] = session.end_time.split(':').map(Number);
      sessionEndTime = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0));
    } else {
      const [startHour, startMinute] = session.start_time.split(':').map(Number);
      const sessionStartTime = new Date(Date.UTC(year, month - 1, day, startHour, startMinute, 0));
      sessionEndTime = new Date(sessionStartTime);
      sessionEndTime.setUTCMinutes(sessionEndTime.getUTCMinutes() + 90);
    }

    if (sessionEndTime && nowTimestamp >= sessionEndTime.getTime()) {
      // Tự động chuyển sang FINISHED
      await session.update({ status: 'FINISHED' });
      return res.status(400).json({
        success: false,
        message: 'Buổi học đã kết thúc, không thể tạo QR điểm danh',
      });
    }

    // Check if attendance session already exists
    const existingAttendance = await AttendanceSession.findOne({
      where: { session_id: id },
    });

    let attendanceSession;
    if (existingAttendance) {
      // Update existing attendance session
      // close_at sẽ là sessionEndTime (QR tồn tại đến khi buổi học kết thúc)
      await existingAttendance.update({
        method,
        open_at: new Date(),
        close_at: sessionEndTime,
        late_after_minutes,
        teacher_latitude: latitude ? parseFloat(latitude) : null,
        teacher_longitude: longitude ? parseFloat(longitude) : null,
        location_radius: location_radius ? parseInt(location_radius) : 10,
      });
      attendanceSession = existingAttendance;
    } else {
      // Create new attendance session
      // close_at sẽ là sessionEndTime (QR tồn tại đến khi buổi học kết thúc)
      const openAt = new Date();

      attendanceSession = await AttendanceSession.create({
        session_id: id,
        method,
        open_at: openAt,
        close_at: sessionEndTime,
        late_after_minutes,
        teacher_latitude: latitude ? parseFloat(latitude) : null,
        teacher_longitude: longitude ? parseFloat(longitude) : null,
        location_radius: location_radius ? parseInt(location_radius) : 10,
      });
    }

    let qrToken = null;
    if (method === 'QR') {
      // QR token sẽ tồn tại đến khi buổi học kết thúc (sessionEndTime)
      const expiresAt = sessionEndTime;

      // Check if QR token already exists for this attendance session
      const existingQRToken = await QRToken.findOne({
        where: { attendance_session_id: attendanceSession.attendance_session_id },
      });

      if (existingQRToken) {
        // Update expiration time to session end time if needed
        if (new Date(existingQRToken.expires_at).getTime() !== expiresAt.getTime()) {
          await existingQRToken.update({ expires_at: expiresAt });
        }
        qrToken = existingQRToken;
      } else {
        // Create new QR token
        let token = generateQRToken();

        // Retry if token already exists
        let attempts = 0;
        let created = false;
        while (!created && attempts < 5) {
          try {
            qrToken = await QRToken.create({
              attendance_session_id: attendanceSession.attendance_session_id,
              token,
              expires_at: expiresAt,
            });
            created = true;
          } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
              token = generateQRToken();
              attempts++;
            } else {
              throw err;
            }
          }
        }

        if (!created) {
          throw new Error('Không thể tạo QR token sau nhiều lần thử. Vui lòng thử lại.');
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        attendance_session_id: attendanceSession.attendance_session_id,
        qr_token: qrToken?.token || null,
        expires_at: attendanceSession.close_at,
        teacher_latitude: attendanceSession.teacher_latitude,
        teacher_longitude: attendanceSession.teacher_longitude,
        location_radius: attendanceSession.location_radius,
      },
    });
  } catch (error) {
    console.error('Start attendance error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session has attendance records
    const { AttendanceSession } = require('../models');
    const attendanceSession = await AttendanceSession.findOne({
      where: { session_id: id },
    });

    if (attendanceSession) {
      // Check if there are any attendance records
      const { AttendanceRecord } = require('../models');
      const recordCount = await AttendanceRecord.count({
        where: { attendance_session_id: attendanceSession.attendance_session_id },
      });

      if (recordCount > 0) {
        return res.status(400).json({
          success: false,
          message:
            'Không thể xóa buổi học đã có điểm danh. Vui lòng xóa các bản ghi điểm danh trước.',
        });
      }
    }

    // Delete the session (cascade will handle related records)
    await session.destroy();

    res.json({
      success: true,
      message: 'Xóa buổi học thành công',
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getSessions,
  createSession,
  updateSession,
  startSession,
  startAttendance,
  deleteSession,
};
