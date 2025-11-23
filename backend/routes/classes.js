const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const classController = require('../controllers/classController');

router.get('/', authenticate, authorize('TEACHER', 'ADMIN'), classController.getClasses);
router.get('/:id', authenticate, authorize('TEACHER', 'ADMIN'), classController.getClassById);
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), classController.createClass);
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), classController.updateClass);
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), classController.deleteClass);

// Student management
router.get('/:id/students', authenticate, authorize('TEACHER', 'ADMIN'), classController.getStudents);
router.post('/:id/students', authenticate, authorize('TEACHER', 'ADMIN'), classController.addStudent);
router.delete('/:id/students/:studentId', authenticate, authorize('TEACHER', 'ADMIN'), classController.removeStudent);

module.exports = router;

