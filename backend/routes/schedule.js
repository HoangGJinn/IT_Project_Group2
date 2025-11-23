const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const scheduleController = require('../controllers/scheduleController');

router.get('/', authenticate, authorize('TEACHER', 'ADMIN'), scheduleController.getSchedule);

module.exports = router;

