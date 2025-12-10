//Diễm Ngoc-----------------------------------------------
const express = require('express');
const router = express.Router();
const adminStudentController = require('../controllers/adminStudentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('ADMIN'), adminStudentController.getAllStudents);
router.get('/:id', authenticate, authorize('ADMIN'), adminStudentController.getStudentById);
router.post('/', authenticate, authorize('ADMIN'), adminStudentController.createStudent);
router.put('/:id', authenticate, authorize('ADMIN'), adminStudentController.updateStudentByAdmin);
router.delete('/:id', authenticate, authorize('ADMIN'), adminStudentController.deleteStudent);
router.get('/detail/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { Student, User } = require('../models');

  try {
    const student = await Student.findOne({
      where: { student_id: req.params.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'user_id',
            'full_name',
            'email',
            'phone',
            'status',
            'created_at',
            'updated_at',
          ],
        },
      ],
    });

    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.json(student);
  } catch (err) {
    console.error('🔥 GET STUDENT DETAIL ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
