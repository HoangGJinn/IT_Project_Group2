const { Class, Course, Teacher, Enrollment, Student, User, Session, AttendanceRecord, AttendanceSession } = require('../models');
const { Op } = require('sequelize');

const getClasses = async (req, res) => {
  try {
    const { school_year, semester, search } = req.query;
    const where = {};

    if (school_year) where.school_year = school_year;
    if (semester) where.semester = semester;
    if (search) {
      where[Op.or] = [
        { class_code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } }
      ];
    }

    // If teacher, only show their classes
    if (req.userRoles.includes('TEACHER')) {
      const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });
      if (teacher) {
        where.teacher_id = teacher.teacher_id;
      }
    }

    const classes = await Class.findAll({
      where,
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['course_id', 'code', 'name']
        },
        {
          model: Teacher,
          as: 'teacher',
          include: [{
            model: User,
            as: 'user',
            attributes: ['full_name']
          }]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findByPk(id, {
      include: [
        {
          model: Course,
          as: 'course'
        },
        {
          model: Teacher,
          as: 'teacher',
          include: [{
            model: User,
            as: 'user'
          }]
        }
      ]
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get students count
    const studentsCount = await Enrollment.count({
      where: { class_id: id, status: 'ENROLLED' }
    });

    res.json({
      success: true,
      data: {
        ...classData.toJSON(),
        students_count: studentsCount
      }
    });
  } catch (error) {
    console.error('Get class by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const createClass = async (req, res) => {
  try {
    const {
      course_id,
      class_code,
      name,
      semester,
      school_year,
      capacity,
      planned_sessions,
      schedule_days,
      schedule_periods,
      image_url
    } = req.body;

    if (!course_id || !class_code || !semester || !school_year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: 'User is not a teacher'
      });
    }

    const classData = await Class.create({
      course_id,
      class_code,
      name,
      teacher_id: teacher.teacher_id,
      semester,
      school_year,
      capacity,
      planned_sessions,
      schedule_days,
      schedule_periods,
      image_url
    });

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: classData
    });
  } catch (error) {
    console.error('Create class error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Class code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const classData = await Class.findByPk(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await classData.update(updates);

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: classData
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findByPk(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await classData.destroy();

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollments = await Enrollment.findAll({
      where: { class_id: id, status: 'ENROLLED' },
      include: [{
        model: Student,
        as: 'student',
        include: [{
          model: User,
          as: 'user',
          attributes: ['full_name', 'email']
        }]
      }]
    });

    // Calculate attendance stats for each student
    const studentsWithStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        const studentId = enrollment.student_id;
        
        // Get total sessions for this class
        const totalSessions = await Session.count({
          where: { class_id: id, status: 'FINISHED' }
        });

        // Get attended sessions
        const attendedSessions = await AttendanceRecord.count({
          where: {
            student_id: studentId,
            status: { [Op.in]: ['PRESENT', 'LATE'] }
          },
          include: [{
            model: AttendanceSession,
            as: 'attendanceSession',
            include: [{
              model: Session,
              as: 'session',
              where: { class_id: id }
            }]
          }]
        });

        const attendanceRate = totalSessions > 0 
          ? ((attendedSessions / totalSessions) * 100).toFixed(1) + '%'
          : '0%';

        return {
          student_id: enrollment.student.student_id,
          student_code: enrollment.student.student_code,
          full_name: enrollment.student.user.full_name,
          total_sessions: totalSessions,
          attended_sessions: attendedSessions,
          attendance_rate: attendanceRate
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithStats
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const addStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const existing = await Enrollment.findOne({
      where: { class_id: id, student_id }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Student already enrolled'
      });
    }

    await Enrollment.create({
      class_id: id,
      student_id,
      status: 'ENROLLED'
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully'
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const removeStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const enrollment = await Enrollment.findOne({
      where: { class_id: id, student_id: studentId }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    await enrollment.destroy();

    res.json({
      success: true,
      message: 'Student removed successfully'
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getStudents,
  addStudent,
  removeStudent
};

