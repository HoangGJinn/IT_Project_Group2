const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const materialController = require('../controllers/materialController');

router.post('/sessions/:id', authenticate, authorize('TEACHER', 'ADMIN'), materialController.uploadMaterial);
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), materialController.deleteMaterial);

module.exports = router;

