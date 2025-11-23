const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

router.get('/classes/:classId', authenticate, authorize('TEACHER', 'ADMIN'), sessionController.getSessions);
router.post('/classes/:classId', authenticate, authorize('TEACHER', 'ADMIN'), sessionController.createSession);
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), sessionController.updateSession);
router.post('/:id/attendance/start', authenticate, authorize('TEACHER', 'ADMIN'), sessionController.startAttendance);

module.exports = router;

