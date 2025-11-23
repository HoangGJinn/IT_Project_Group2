const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const courseController = require('../controllers/courseController');

router.get('/', authenticate, authorize('TEACHER', 'ADMIN'), courseController.getCourses);

module.exports = router;
