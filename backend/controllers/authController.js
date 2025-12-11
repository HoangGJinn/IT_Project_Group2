const { User, Role, Student, Teacher, AuthProvider } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../middleware/auth');
const { verifyGoogleToken } = require('../utils/googleAuth');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
        },
      ],
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        roles: user.roles.map(r => r.code),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const register = async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and full_name are required',
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      });
    }

    const password_hash = await hashPassword(password);
    const user = await User.create({
      email,
      password_hash,
      full_name,
      phone,
      status: 'ACTIVE',
    });

    // Assign STUDENT role by default
    const studentRole = await Role.findOne({ where: { code: 'STUDENT' } });
    if (studentRole) {
      await user.addRole(studentRole);
      await Student.create({
        user_id: user.user_id,
        student_code: `STU${user.user_id}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user_id: user.user_id,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;

    if (!id_token) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify Google token
    const googleUser = await verifyGoogleToken(id_token);

    if (!googleUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Email not provided by Google',
      });
    }

    // 1) Nếu provider_uid đã tồn tại, lấy user từ đó để tránh lỗi unique
    const existingProvider = await AuthProvider.findOne({
      where: {
        provider: 'GOOGLE',
        provider_uid: googleUser.googleId,
      },
      include: [
        {
          model: User,
          as: 'user',
          include: [
            {
              model: Role,
              as: 'roles',
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    let user = existingProvider?.user || null;

    // 2) Nếu chưa có provider, tiếp tục flow tìm user theo email
    if (!user) {
      user = await User.findOne({
        where: { email: googleUser.email },
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
          },
        ],
      });
    }

    // 3) Nếu user đã có nhưng chưa có auth provider cho Google ID này, tạo mới
    if (user && !existingProvider) {
      await AuthProvider.create({
        user_id: user.user_id,
        provider: 'GOOGLE',
        provider_uid: googleUser.googleId,
      });
    }

    // 4) Nếu chưa có user, tạo mới cùng provider + role mặc định
    if (!user) {
      const fullName =
        googleUser.name ||
        `${googleUser.givenName || ''} ${googleUser.familyName || ''}`.trim() ||
        'Google User';

      user = await User.create({
        email: googleUser.email,
        password_hash: null, // No password for Google users
        full_name: fullName,
        status: 'ACTIVE',
      });

      await AuthProvider.create({
        user_id: user.user_id,
        provider: 'GOOGLE',
        provider_uid: googleUser.googleId,
      });

      const studentRole = await Role.findOne({ where: { code: 'STUDENT' } });
      if (studentRole) {
        await user.addRole(studentRole);
        await Student.create({
          user_id: user.user_id,
          student_code: `STU${user.user_id}`,
        });
      }

      // Reload user with roles
      user = await User.findByPk(user.user_id, {
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
          },
        ],
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is not active',
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        roles: user.roles.map(r => r.code),
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  login,
  register,
  googleLogin,
};
