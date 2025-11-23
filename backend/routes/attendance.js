const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const attendanceController = require('../controllers/attendanceController');

router.post('/scan', authenticate, authorize('STUDENT'), attendanceController.scanQR);
router.get('/sessions/:id', authenticate, authorize('TEACHER', 'ADMIN'), attendanceController.getAttendance);
router.put('/:recordId', authenticate, authorize('TEACHER', 'ADMIN'), attendanceController.updateAttendance);

module.exports = router;

