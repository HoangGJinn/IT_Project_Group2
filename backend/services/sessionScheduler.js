const { Session } = require('../models');
const { Op } = require('sequelize');

/**
 * Tự động chuyển các session từ ONGOING sang FINISHED khi đã hết thời gian
 * Chạy định kỳ mỗi phút để đảm bảo session được cập nhật kịp thời
 */
const updateFinishedSessions = async () => {
  try {
    const now = new Date();

    // Lấy tất cả session có status ONGOING
    const ongoingSessions = await Session.findAll({
      where: {
        status: 'ONGOING',
      },
    });

    let updatedCount = 0;

    for (const session of ongoingSessions) {
      const sessionData = session.toJSON();

      // Tính toán thời gian kết thúc
      const sessionDate = new Date(sessionData.date);
      const [startHour, startMinute] = sessionData.start_time.split(':').map(Number);
      const sessionStartTime = new Date(sessionDate);
      sessionStartTime.setHours(startHour, startMinute, 0, 0);

      let sessionEndTime = null;
      if (sessionData.end_time) {
        const [endHour, endMinute] = sessionData.end_time.split(':').map(Number);
        sessionEndTime = new Date(sessionDate);
        sessionEndTime.setHours(endHour, endMinute, 0, 0);
      } else {
        // Mặc định 90 phút nếu không có end_time
        sessionEndTime = new Date(sessionStartTime);
        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
      }

      // Nếu đã hết thời gian, chuyển sang FINISHED
      if (sessionEndTime && now >= sessionEndTime) {
        await session.update({ status: 'FINISHED' });
        updatedCount++;
        console.log(
          `✅ Auto-updated session ${sessionData.session_id} (class ${sessionData.class_id}) from ONGOING to FINISHED`
        );
      }
    }

    if (updatedCount > 0) {
      console.log(`📊 Updated ${updatedCount} session(s) to FINISHED status`);
    }

    return updatedCount;
  } catch (error) {
    console.error('❌ Error updating finished sessions:', error);
    return 0;
  }
};

/**
 * Khởi động scheduler để chạy định kỳ
 * @param {number} intervalMinutes - Số phút giữa mỗi lần chạy (mặc định 1 phút)
 */
const startSessionScheduler = (intervalMinutes = 1) => {
  console.log(`🕐 Session scheduler started (checking every ${intervalMinutes} minute(s))`);

  // Chạy ngay lập tức lần đầu
  updateFinishedSessions();

  // Sau đó chạy định kỳ
  const intervalMs = intervalMinutes * 60 * 1000;
  const intervalId = setInterval(() => {
    updateFinishedSessions();
  }, intervalMs);

  return intervalId;
};

module.exports = {
  updateFinishedSessions,
  startSessionScheduler,
};
