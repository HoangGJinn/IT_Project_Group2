const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.put('/change-password', authenticate, userController.changePassword);
router.post('/create-full', authenticate, userController.createStudentUser);
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await userController.getUserById(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(404).json({ message: 'User not found' });
  }
});
router.put('/:id', authenticate, userController.updateUserByAdmin);
router.delete('/:id', authenticate, userController.deleteStudentUser);
router.delete('/:id', authenticate, userController.deleteTeacherUser);
router.post('/create-full-teacher', authenticate, userController.createTeachertUser);
router.put('/:id/reset-password', authenticate, userController.resetPasswordToDefault);

module.exports = router;
