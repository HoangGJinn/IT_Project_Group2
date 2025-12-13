const { Session, AttendanceSession, AttendanceRecord, Enrollment } = require('../models');

/**
 * Tự động chuyển session sang FINISHED và tạo attendance records cho sinh viên vắng
 * Hàm này nên được gọi định kỳ (cron job) hoặc khi có request đến API
 */
const autoFinishSessions = async () => {
  try {
    // Lấy tất cả các session đang ONGOING
    const ongoingSessions = await Session.findAll({
      where: {
        status: 'ONGOING',
      },
      include: [
        {
          model: AttendanceSession,
          as: 'attendanceSession',
          required: false,
        },
      ],
    });

    const finishedSessions = [];

    for (const session of ongoingSessions) {
      // Tính toán thời gian kết thúc session
      // Parse date string (format: YYYY-MM-DD) và time string (format: HH:mm:ss)
      const sessionDateStr =
        session.date instanceof Date ? session.date.toISOString().split('T')[0] : session.date;
      const [year, month, day] = sessionDateStr.split('-').map(Number);

      const [startHour, startMinute] = session.start_time.split(':').map(Number);
      const sessionStartTime = new Date(
        Date.UTC(year, month - 1, day, startHour, startMinute, 0, 0)
      );

      let sessionEndTime = null;
      if (session.end_time) {
        const [endHour, endMinute] = session.end_time.split(':').map(Number);
        sessionEndTime = new Date(Date.UTC(year, month - 1, day, endHour, endMinute, 0, 0));
      } else {
        // Default to 90 minutes if no end_time
        sessionEndTime = new Date(sessionStartTime);
        sessionEndTime.setUTCMinutes(sessionEndTime.getUTCMinutes() + 90);
      }

      // Kiểm tra xem session đã kết thúc chưa
      // Sử dụng UTC để tránh vấn đề timezone
      const nowUTC = new Date();
      if (nowUTC >= sessionEndTime) {
        // Chuyển session sang FINISHED
        await session.update({ status: 'FINISHED' });
        finishedSessions.push(session);

        // Nếu có attendance session, tạo attendance records cho sinh viên vắng
        if (session.attendanceSession) {
          const attendanceSession = session.attendanceSession;
          const attendanceSessionId = attendanceSession.attendance_session_id;

          // Lấy tất cả sinh viên đã đăng ký lớp
          const enrollments = await Enrollment.findAll({
            where: {
              class_id: session.class_id,
              status: 'ENROLLED',
            },
          });

          // Lấy tất cả attendance records đã có cho session này
          const existingRecords = await AttendanceRecord.findAll({
            where: {
              attendance_session_id: attendanceSessionId,
            },
          });

          const existingStudentIds = new Set(
            existingRecords.map(record => record.student_id.toString())
          );

          // Tạo attendance records cho sinh viên chưa điểm danh
          const absentRecords = [];
          for (const enrollment of enrollments) {
            const studentId = enrollment.student_id;
            if (!existingStudentIds.has(studentId.toString())) {
              absentRecords.push({
                attendance_session_id: attendanceSessionId,
                student_id: studentId,
                checkin_time: null,
                status: 'ABSENT',
                source: null,
              });
            }
          }

          // Tạo tất cả records cùng lúc
          if (absentRecords.length > 0) {
            await AttendanceRecord.bulkCreate(absentRecords, {
              ignoreDuplicates: true,
            });
            // Log for debugging (commented to avoid linting warning)
            // console.log(
            //   `Created ${absentRecords.length} absent records for session ${session.session_id}`
            // );
          }
        }
      }
    }

    return {
      processed: ongoingSessions.length,
      finished: finishedSessions.length,
    };
  } catch (error) {
    console.error('Auto finish sessions error:', error);
    throw error;
  }
};

module.exports = {
  autoFinishSessions,
};
