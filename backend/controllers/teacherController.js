const db = require('../models');
const { Teacher, User } = db;

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone'],
        },
      ],
    });

    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const data = await Teacher.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'Teacher not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.create(req.body);
    res.json({ message: 'Teacher created', teacher });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    console.log('📥 UPDATE TEACHER BODY:', req.body);

    const teacher = await Teacher.findOne({
      where: { user_id: req.params.id }, // ← TÌM THEO user_id
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await teacher.update({
      teacher_code: req.body.teacher_code,
      academic_title: req.body.academic_title,
    });

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      teacher,
    });
  } catch (error) {
    console.error('🔥 UPDATE TEACHER ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const deleted = await Teacher.destroy({
      where: { teacher_id: req.params.id },
    });

    if (!deleted) return res.status(404).json({ message: 'Teacher not found' });

    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
