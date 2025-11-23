const { Course } = require('../models');

const getCourses = async (req, res) => {
  try {
    const courses = await Course.findAll({
      attributes: ['course_id', 'code', 'name', 'credits'],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getCourses,
};
