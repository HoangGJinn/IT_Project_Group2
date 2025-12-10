const { User, Student, Teacher } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.user_id, {
      attributes: { exclude: ['password_hash'] },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const user = await User.findByPk(req.user.user_id);

    if (full_name) user.full_name = full_name;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Old password and new password are required',
      });
    }

    const user = await User.findByPk(req.user.user_id);
    if (!user.password_hash) {
      return res.status(400).json({
        success: false,
        message: 'Password not set',
      });
    }

    const isValid = await comparePassword(old_password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid old password',
      });
    }

    user.password_hash = await hashPassword(new_password);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const createStudentUser = async (req, res) => {
  try {
    console.log(' BODY RECEIVED:', req.body); // ← thêm dòng này

    const { full_name, email, phone, password, student_code, class_cohort } = req.body;

    if (!full_name || !email || !password || !student_code) {
      console.log(' Missing:', { full_name, email, password, student_code });

      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const existed = await User.findOne({ where: { email } });
    if (existed) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const newUser = await User.create({
      full_name,
      email,
      phone,
      password_hash: await hashPassword(password),
    });

    const newStudent = await Student.create({
      user_id: newUser.user_id,
      student_code,
      class_cohort,
    });

    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: { user: newUser, student: newStudent },
    });
  } catch (error) {
    console.error(' Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
const getUserById = async id => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password_hash'] },
  });
  return user;
};
const updateUserByAdmin = async (req, res) => {
  try {
    const { full_name, email, phone, status } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.update({ full_name, email, phone, status });

    res.json({
      success: true,
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error(' BACKEND ERROR — updateProfile');
    console.error(' BODY RECEIVED:', req.body);
    console.error(' ERROR MESSAGE:', error.message);
    console.error(' FULL ERROR:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteStudentUser = async (req, res) => {
  try {
    const user_id = req.params.id;

    console.log('DELETE user_id =', user_id);

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'Missing user_id' });
    }

    const student = await Student.findOne({ where: { user_id } });
    if (student) await student.destroy();

    const user = await User.findByPk(user_id);
    if (user) await user.destroy();

    res.json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    console.error(' DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

const deleteTeacherUser = async (req, res) => {
  try {
    const user_id = req.params.id;

    console.log('DELETE user_id =', user_id);

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'Missing user_id' });
    }

    const teacher = await Teacher.findOne({ where: { user_id } });
    if (teacher) await teacher.destroy();

    const user = await User.findByPk(user_id);
    if (user) await user.destroy();

    res.json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (error) {
    console.error(' DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

const createTeachertUser = async (req, res) => {
  try {
    console.log(' BODY RECEIVED:', req.body); // ← thêm dòng này

    const { full_name, email, phone, password, teacher_code, academic_title } = req.body;

    if (!full_name || !email || !password || !teacher_code) {
      console.log(' Missing:', { full_name, email, password, teacher_code });

      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const existed = await User.findOne({ where: { email } });
    if (existed) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const newUser = await User.create({
      full_name,
      email,
      phone,
      password_hash: await hashPassword(password),
    });

    const newTeacher = await Teacher.create({
      user_id: newUser.user_id,
      teacher_code,
      academic_title,
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: { user: newUser, teacher: newTeacher },
    });
  } catch (error) {
    console.error(' Create teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const resetPasswordToDefault = async (req, res) => {
  try {
    const user_id = req.params.id;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing user_id',
      });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const defaultPassword = '123456';
    user.password_hash = await hashPassword(defaultPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password reset to default (123456) successfully',
    });
  } catch (error) {
    console.error('🔥 Reset default password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  createStudentUser,
  getUserById,
  updateUserByAdmin,
  deleteStudentUser,
  deleteTeacherUser,
  createTeachertUser,
  resetPasswordToDefault,
};
