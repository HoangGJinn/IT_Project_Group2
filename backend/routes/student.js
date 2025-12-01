const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const studentController = require('../controllers/studentController');
const attendanceController = require('../controllers/attendanceController');

router.get('/classes', authenticate, authorize('STUDENT'), studentController.getClasses);
router.get('/classes/:id', authenticate, authorize('STUDENT'), studentController.getClassById);
router.get('/attendance', authenticate, authorize('STUDENT'), studentController.getAttendanceHistory);
router.post('/attendance/scan', authenticate, authorize('STUDENT'), attendanceController.scanQR);
router.get('/profile', authenticate, authorize('STUDENT'), studentController.getProfile);

module.exports = router;

