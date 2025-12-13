const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const sessionController = require('../controllers/sessionController');

router.get(
  '/classes/:classId',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  sessionController.getSessions
);
router.post(
  '/classes/:classId',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  sessionController.createSession
);
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), sessionController.updateSession);
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), sessionController.deleteSession);
router.post(
  '/:id/start',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  sessionController.startSession
);
router.post(
  '/:id/attendance/start',
  authenticate,
  authorize('TEACHER', 'ADMIN'),
  sessionController.startAttendance
);

// Endpoint để tự động xử lý các session đã kết thúc (có thể gọi từ cron job)
router.post('/auto-finish', sessionController.autoFinish);

module.exports = router;
