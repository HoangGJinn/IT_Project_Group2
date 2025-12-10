const db = require('../models');
const { Student, User } = db;

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone'],
        },
      ],
    });

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const data = await Student.findByPk(req.params.id);
    if (!data) return res.status(404).json({ message: 'Student not found' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.json({ message: 'Student created', student });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateStudentByAdmin = async (req, res) => {
  try {
    console.log('📥 UPDATE STUDENT BODY:', req.body);

    const student = await Student.findOne({
      where: { user_id: req.params.id }, // ← TÌM THEO user_id
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await student.update({
      student_code: req.body.student_code,
      class_cohort: req.body.class_cohort,
    });

    res.json({
      success: true,
      message: 'Student updated successfully',
      student,
    });
  } catch (error) {
    console.error('🔥 UPDATE STUDENT ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const deleted = await Student.destroy({
      where: { student_id: req.params.id },
    });

    if (!deleted) return res.status(404).json({ message: 'Student not found' });

    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
