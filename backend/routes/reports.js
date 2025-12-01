const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.get('/attendance', authenticate, authorize('TEACHER', 'ADMIN'), reportController.getAttendanceReport);
router.get('/classes/:classId', authenticate, authorize('TEACHER', 'ADMIN'), reportController.getClassReport);
router.get('/export', authenticate, authorize('TEACHER', 'ADMIN'), reportController.exportReport);

module.exports = router;

