const { Session } = require('../models');
const { Op } = require('sequelize');

/**
 * Tự động chuyển các session từ ONGOING sang FINISHED khi đã hết thời gian
 * Chạy định kỳ mỗi phút để đảm bảo session được cập nhật kịp thời
 */
const updateFinishedSessions = async () => {
  try {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Lấy tất cả session có status ONGOING
    const ongoingSessions = await Session.findAll({
      where: {
        status: 'ONGOING',
      },
    });

    if (ongoingSessions.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    for (const session of ongoingSessions) {
      const sessionData = session.toJSON();

      // Tính toán thời gian kết thúc
      // Parse date string (YYYY-MM-DD) với timezone VN (UTC+7)
      // Format: 'YYYY-MM-DDTHH:mm:ss+07:00' để đảm bảo timezone đúng
      const [startHour, startMinute] = sessionData.start_time.split(':').map(Number);
      const sessionStartTime = new Date(`${sessionData.date}T${sessionData.start_time}:00+07:00`);

      let sessionEndTime = null;
      if (sessionData.end_time) {
        sessionEndTime = new Date(`${sessionData.date}T${sessionData.end_time}:00+07:00`);
      } else {
        // Mặc định 90 phút nếu không có end_time
        sessionEndTime = new Date(sessionStartTime);
        sessionEndTime.setMinutes(sessionEndTime.getMinutes() + 90);
      }

      // Debug log để kiểm tra timezone
      const timeDiff = now.getTime() - sessionEndTime.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      // Nếu đã hết thời gian, chuyển sang FINISHED
      if (sessionEndTime && now >= sessionEndTime) {
        await session.update({ status: 'FINISHED' });
        updatedCount++;
        console.log(
          `✅ Auto-updated session ${sessionData.session_id} (class ${sessionData.class_id}) from ONGOING to FINISHED`
        );
        console.log(
          `   📅 Date: ${sessionData.date}, End time: ${sessionData.end_time || 'N/A (90min default)'}, ` +
            `Now: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}, ` +
            `End: ${sessionEndTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}, ` +
            `Diff: ${minutesDiff} minutes, Timezone: ${timezone}`
        );
      } else if (minutesDiff > -5 && minutesDiff < 5) {
        // Log khi gần đến giờ (trong vòng 5 phút) để debug
        console.log(
          `⏰ Session ${sessionData.session_id} check: ` +
            `Now: ${now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}, ` +
            `End: ${sessionEndTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}, ` +
            `Diff: ${minutesDiff} minutes`
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
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`🕐 Session scheduler started (checking every ${intervalMinutes} minute(s))`);
  console.log(`🌍 Server timezone: ${timezone}`);
  console.log(
    `🕐 Current time: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
  );

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
