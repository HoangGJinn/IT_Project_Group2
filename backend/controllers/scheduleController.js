const { Class, Session, Teacher, User } = require('../models');
const { Op } = require('sequelize');

const getSchedule = async (req, res) => {
  try {
    const { week_start, week_end } = req.query;

    const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: 'User is not a teacher'
      });
    }

    const classes = await Class.findAll({
      where: { teacher_id: teacher.teacher_id }
    });

    const classIds = classes.map(c => c.class_id);

    let where = { class_id: { [Op.in]: classIds } };
    if (week_start && week_end) {
      where.date = {
        [Op.between]: [week_start, week_end]
      };
    }

    const sessions = await Session.findAll({
      where,
      include: [{
        model: Class,
        as: 'class',
        attributes: ['class_id', 'class_code', 'name']
      }],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    // Group by day of week
    const schedule = {};
    sessions.forEach(session => {
      const date = new Date(session.date);
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (!schedule[day]) {
        schedule[day] = {
          day,
          day_name: getDayName(day),
          sessions: []
        };
      }

      schedule[day].sessions.push({
        session_id: session.session_id,
        class: {
          class_id: session.class.class_id,
          class_code: session.class.class_code,
          name: session.class.name
        },
        start_time: session.start_time,
        end_time: session.end_time,
        room: session.room
      });
    });

    res.json({
      success: true,
      data: {
        week_start: week_start || null,
        week_end: week_end || null,
        schedule: Object.values(schedule)
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getDayName = (day) => {
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[day];
};

module.exports = {
  getSchedule
};

