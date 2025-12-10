//Diễm Ngọc -----------------------------------------------
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const controller = require('../controllers/teacherController');

router.get('/', authenticate, authorize('ADMIN'), controller.getAllTeachers);
router.get('/:id', authenticate, authorize('ADMIN'), controller.getTeacherById);
router.post('/', authenticate, authorize('ADMIN'), controller.createTeacher);
router.put('/:id', authenticate, authorize('ADMIN'), controller.updateTeacher);
router.delete('/:id', authenticate, authorize('ADMIN'), controller.deleteTeacher);
router.get('/detail/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { Teacher, User } = require('../models');

  try {
    const teacher = await Teacher.findOne({
      where: { teacher_id: req.params.id },
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

    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    res.json(teacher);
  } catch (err) {
    console.error('🔥 GET TEACHER DETAIL ERROR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
//---------------------------------------------------Diễm Ngọc
