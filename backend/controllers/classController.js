const {
  Class,
  Course,
  Teacher,
  Enrollment,
  Student,
  User,
  Session,
  AttendanceRecord,
  AttendanceSession,
} = require('../models');
const { Op } = require('sequelize');
const { calculateDistance } = require('../utils/geolocation');

const getClasses = async (req, res) => {
  try {
    const { school_year, semester, search } = req.query;
    const where = {};

    if (school_year) where.school_year = school_year;
    if (semester) where.semester = semester;
    if (search) {
      where[Op.or] = [
        { class_code: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
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
          attributes: ['course_id', 'code', 'name'],
        },
        {
          model: Teacher,
          as: 'teacher',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
          as: 'course',
        },
        {
          model: Teacher,
          as: 'teacher',
          include: [
            {
              model: User,
              as: 'user',
            },
          ],
        },
      ],
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Get students count
    const studentsCount = await Enrollment.count({
      where: { class_id: id, status: 'ENROLLED' },
    });

    res.json({
      success: true,
      data: {
        ...classData.toJSON(),
        students_count: studentsCount,
      },
    });
  } catch (error) {
    console.error('Get class by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Helper function to convert period to time
const periodToTime = period => {
  if (period <= 4) return `${6 + period}:00`;
  if (period <= 6) return `${period + 4}:00`;
  if (period <= 10) return `${period}:00`;
  return `${period - 2}:00`;
};

// Helper function to parse schedule_days
// Returns JavaScript day format: 0=Sunday, 1=Monday, ..., 6=Saturday
const parseScheduleDays = scheduleDays => {
  if (!scheduleDays) return [];

  const days = [];
  const lowerSchedule = scheduleDays.toLowerCase().trim();

  // Map Vietnamese day names to JavaScript day format
  const dayMap = {
    'chủ nhật': 0, // Sunday -> 0 (JavaScript format)
    'thứ 2': 1, // Monday -> 1
    'thứ 3': 2, // Tuesday -> 2
    'thứ 4': 3, // Wednesday -> 3
    'thứ 5': 4, // Thursday -> 4
    'thứ 6': 5, // Friday -> 5
    'thứ 7': 6, // Saturday -> 6
  };

  // Check for Vietnamese day names first
  let foundVietnamese = false;
  Object.keys(dayMap).forEach(dayName => {
    if (lowerSchedule.includes(dayName)) {
      days.push(dayMap[dayName]);
      foundVietnamese = true;
    }
  });

  if (foundVietnamese) {
    return days;
  }

  // Otherwise, try to parse as numbers
  // Note: In our system input, 1=Monday, 2=Tuesday, ..., 7=Sunday
  // But we need JavaScript format: 0=Sunday, 1=Monday, ..., 6=Saturday
  const numericMatch = lowerSchedule.match(/\d+/g);
  if (numericMatch) {
    return numericMatch.map(d => {
      const num = parseInt(d);
      // Convert: 1->1, 2->2, 3->3, 4->4, 5->5, 6->6, 7->0 (Sunday)
      return num === 7 ? 0 : num;
    });
  }

  return days;
};

// Helper function to parse schedule_periods
const parseSchedulePeriods = schedulePeriods => {
  if (!schedulePeriods) return null;

  const match = schedulePeriods.match(/(\d+)[\s\->]+(\d+)/);
  if (match) {
    return {
      start: parseInt(match[1]),
      end: parseInt(match[2]),
    };
  }

  const singleMatch = schedulePeriods.match(/(\d+)/);
  if (singleMatch) {
    const period = parseInt(singleMatch[1]);
    return { start: period, end: period };
  }

  return null;
};

// Helper function to create sessions from schedule
const createSessionsFromSchedule = async (
  classId,
  scheduleDays,
  schedulePeriods,
  startDate,
  endDate
) => {
  if (!scheduleDays || !schedulePeriods || !startDate || !endDate) {
    return; // Don't create sessions if schedule info is incomplete
  }

  const { Session } = require('../models');

  const scheduleDaysArray = parseScheduleDays(scheduleDays);
  const schedulePeriodsObj = parseSchedulePeriods(schedulePeriods);

  if (scheduleDaysArray.length === 0 || !schedulePeriodsObj) {
    return;
  }

  const startTime = periodToTime(schedulePeriodsObj.start);
  const endTime = periodToTime(schedulePeriodsObj.end);

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  const sessionsToCreate = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (scheduleDaysArray.includes(dayOfWeek)) {
      const dateStr = d.toISOString().split('T')[0];

      // Check if session already exists for this date
      const existingSession = await Session.findOne({
        where: {
          class_id: classId,
          date: dateStr,
        },
      });

      if (!existingSession) {
        sessionsToCreate.push({
          class_id: classId,
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          status: 'ONGOING',
        });
      }
    }
  }

  // Found sessions to create
  // console.log(`[CreateSessions] Found ${sessionsToCreate.length} sessions to create for class ${classId}`);

  if (sessionsToCreate.length > 0) {
    try {
      await Session.bulkCreate(sessionsToCreate, { ignoreDuplicates: true });
    } catch (error) {
      console.error(`[CreateSessions] Error creating sessions:`, error);
      throw error;
    }
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
      start_date,
      end_date,
      image_url,
    } = req.body;

    if (!course_id || !class_code || !semester || !school_year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: 'User is not a teacher',
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
      start_date: start_date || null,
      end_date: end_date || null,
      image_url,
    });

    // Tự động tạo các session từ schedule nếu có đầy đủ thông tin
    if (schedule_days && schedule_periods && start_date && end_date) {
      try {
        await createSessionsFromSchedule(
          classData.class_id,
          schedule_days,
          schedule_periods,
          start_date,
          end_date
        );
      } catch (sessionError) {
        console.error('Error creating sessions from schedule:', sessionError);
        // Don't fail the class creation if session creation fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: classData,
    });
  } catch (error) {
    console.error('Create class error:', error);

    // Handle duplicate entry error
    if (
      error.name === 'SequelizeUniqueConstraintError' ||
      error.original?.code === 'ER_DUP_ENTRY' ||
      error.code === 'ER_DUP_ENTRY'
    ) {
      const duplicateField = error.fields?.class_code ? 'Mã lớp' : 'thông tin';
      const duplicateValue = error.fields?.class_code || 'đã tồn tại';
      return res.status(400).json({
        success: false,
        message: `${duplicateField} "${duplicateValue}" đã tồn tại. Vui lòng chọn mã lớp khác.`,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
        message: 'Class not found',
      });
    }

    await classData.update(updates);

    // Tự động tạo các session từ schedule nếu schedule được cập nhật
    const scheduleDays =
      updates.schedule_days !== undefined ? updates.schedule_days : classData.schedule_days;
    const schedulePeriods =
      updates.schedule_periods !== undefined
        ? updates.schedule_periods
        : classData.schedule_periods;
    const startDate = updates.start_date !== undefined ? updates.start_date : classData.start_date;
    const endDate = updates.end_date !== undefined ? updates.end_date : classData.end_date;

    // Chỉ tạo sessions nếu schedule được cập nhật và có đầy đủ thông tin
    if (
      (updates.schedule_days !== undefined ||
        updates.schedule_periods !== undefined ||
        updates.start_date !== undefined ||
        updates.end_date !== undefined) &&
      scheduleDays &&
      schedulePeriods &&
      startDate &&
      endDate
    ) {
      try {
        await createSessionsFromSchedule(
          classData.class_id,
          scheduleDays,
          schedulePeriods,
          startDate,
          endDate
        );
      } catch (sessionError) {
        console.error('Error creating sessions from schedule:', sessionError);
        // Don't fail the class update if session creation fails
      }
    }

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: classData,
    });
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
        message: 'Class not found',
      });
    }

    await classData.destroy();

    res.json({
      success: true,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const enrollments = await Enrollment.findAll({
      where: { class_id: id, status: 'ENROLLED' },
      include: [
        {
          model: Student,
          as: 'student',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name', 'email'],
            },
          ],
        },
      ],
    });

    // Calculate attendance stats for each student
    const studentsWithStats = await Promise.all(
      enrollments.map(async enrollment => {
        const studentId = enrollment.student_id;

        // Get total sessions for this class
        // Count FINISHED sessions (all of them count)
        const finishedSessions = await Session.count({
          where: { class_id: id, status: 'FINISHED' },
        });

        // Count distinct ONGOING sessions where this student has attendance record
        const ongoingAttendanceRecords = await AttendanceRecord.findAll({
          where: {
            student_id: studentId,
            status: { [Op.in]: ['PRESENT', 'LATE'] },
          },
          include: [
            {
              model: AttendanceSession,
              as: 'attendanceSession',
              required: true,
              include: [
                {
                  model: Session,
                  as: 'session',
                  required: true,
                  where: {
                    class_id: id,
                    status: 'ONGOING',
                  },
                },
              ],
            },
          ],
        });

        const ongoingSessionIds = new Set();
        ongoingAttendanceRecords.forEach(record => {
          if (record.attendanceSession?.session?.session_id) {
            ongoingSessionIds.add(record.attendanceSession.session.session_id);
          }
        });

        const totalSessions = finishedSessions + ongoingSessionIds.size;

        // Get attended sessions (both FINISHED and ONGOING)
        const attendanceRecords = await AttendanceRecord.findAll({
          where: {
            student_id: studentId,
            status: { [Op.in]: ['PRESENT', 'LATE'] },
          },
          include: [
            {
              model: AttendanceSession,
              as: 'attendanceSession',
              required: true,
              include: [
                {
                  model: Session,
                  as: 'session',
                  required: true,
                  where: {
                    class_id: id,
                    status: { [Op.in]: ['FINISHED', 'ONGOING'] },
                  },
                },
              ],
            },
          ],
        });

        const attendedSessions = attendanceRecords.length;

        // Calculate validation stats
        const validRecords = attendanceRecords.filter(r => r.is_valid === 1).length;
        const invalidRecords = attendanceRecords.filter(r => r.is_valid === 0).length;
        const pendingRecords = attendanceRecords.filter(r => r.is_valid === null).length;
        const recordsWithValidation = attendanceRecords.filter(r => r.is_valid !== null).length;

        const attendanceRate =
          totalSessions > 0 ? ((attendedSessions / totalSessions) * 100).toFixed(1) + '%' : '0%';

        const validRate =
          recordsWithValidation > 0
            ? ((validRecords / recordsWithValidation) * 100).toFixed(1) + '%'
            : '0%';

        const invalidRate =
          recordsWithValidation > 0
            ? ((invalidRecords / recordsWithValidation) * 100).toFixed(1) + '%'
            : '0%';

        return {
          student_id: enrollment.student.student_id,
          student_code: enrollment.student.student_code,
          full_name: enrollment.student.user.full_name,
          total_sessions: totalSessions,
          attended_sessions: attendedSessions,
          attendance_rate: attendanceRate,
          valid_sessions: validRecords,
          invalid_sessions: invalidRecords,
          pending_sessions: pendingRecords,
          valid_rate: validRate,
          invalid_rate: invalidRate,
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithStats,
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
        message: 'Student ID is required',
      });
    }

    const existing = await Enrollment.findOne({
      where: { class_id: id, student_id },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Student already enrolled',
      });
    }

    await Enrollment.create({
      class_id: id,
      student_id,
      status: 'ENROLLED',
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const removeStudent = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const enrollment = await Enrollment.findOne({
      where: { class_id: id, student_id: studentId },
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    await enrollment.destroy();

    res.json({
      success: true,
      message: 'Student removed successfully',
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const searchStudent = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Student code is required',
      });
    }

    const student = await Student.findOne({
      where: { student_code: code },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email'],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: {
        student_id: student.student_id,
        student_code: student.student_code,
        full_name: student.user.full_name,
        email: student.user.email,
      },
    });
  } catch (error) {
    console.error('Search student error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getAllAttendanceRecords = async (req, res) => {
  try {
    const { id } = req.params;

    // Get class info with location
    const classData = await Class.findByPk(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Get all sessions for this class (both ONGOING and FINISHED)
    const sessions = await Session.findAll({
      where: {
        class_id: id,
        status: { [Op.in]: ['ONGOING', 'FINISHED'] },
      },
      order: [
        ['date', 'DESC'],
        ['start_time', 'DESC'],
      ],
    });

    const sessionIds = sessions.map(s => s.session_id);

    // Get attendance sessions
    let attendanceSessions = [];
    if (sessionIds.length > 0) {
      attendanceSessions = await AttendanceSession.findAll({
        where: {
          session_id: { [Op.in]: sessionIds },
        },
        include: [
          {
            model: Session,
            as: 'session',
            attributes: ['session_id', 'date', 'start_time', 'end_time', 'room', 'topic', 'status'],
          },
        ],
      });
    }

    const attendanceSessionIds = attendanceSessions.map(as => as.attendance_session_id);

    // Get all attendance records
    let records = [];
    if (attendanceSessionIds.length > 0) {
      records = await AttendanceRecord.findAll({
        where: {
          attendance_session_id: { [Op.in]: attendanceSessionIds },
        },
        // Don't specify attributes - Sequelize will include all fields by default
        include: [
          {
            model: Student,
            as: 'student',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['full_name', 'email'],
              },
            ],
          },
          {
            model: AttendanceSession,
            as: 'attendanceSession',
            include: [
              {
                model: Session,
                as: 'session',
                attributes: [
                  'session_id',
                  'date',
                  'start_time',
                  'end_time',
                  'room',
                  'topic',
                  'status',
                ],
              },
            ],
          },
        ],
        order: [['checkin_time', 'DESC']],
        raw: false, // Ensure we get model instances, not plain objects
      });
    }

    // Format records with location validation
    const formattedRecords = records.map(record => {
      const recordData = record.toJSON();
      let locationValid = null;
      let distance = null;

      // Check if location is valid (if class has location set)
      if (classData.latitude && classData.longitude) {
        if (recordData.latitude && recordData.longitude) {
          // Student has GPS, check distance
          const radius = classData.location_radius || 100;
          const classLat = parseFloat(classData.latitude);
          const classLon = parseFloat(classData.longitude);
          const recordLat = parseFloat(recordData.latitude);
          const recordLon = parseFloat(recordData.longitude);

          distance = calculateDistance(classLat, classLon, recordLat, recordLon);
          locationValid = distance <= radius;
        } else {
          // Class requires location but student doesn't have GPS - invalid
          locationValid = false;
        }
      }

      // Ensure is_valid is properly converted (could be 1, 0, or null)
      // Get is_valid directly from the record model, not from toJSON() which might not include it
      const rawIsValid = record.is_valid !== undefined ? record.is_valid : recordData.is_valid;
      const isValidValue =
        rawIsValid === null || rawIsValid === undefined
          ? null
          : rawIsValid === 1 || rawIsValid === true
            ? 1
            : 0;

      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        // Record is_valid - debug info available in development
      }

      return {
        record_id: recordData.record_id,
        student: {
          student_id: recordData.student.student_id,
          student_code: recordData.student.student_code,
          full_name: recordData.student.user.full_name,
          email: recordData.student.user.email,
        },
        session: {
          session_id: recordData.attendanceSession?.session?.session_id,
          date: recordData.attendanceSession?.session?.date,
          start_time: recordData.attendanceSession?.session?.start_time,
          end_time: recordData.attendanceSession?.session?.end_time,
          room: recordData.attendanceSession?.session?.room,
          topic: recordData.attendanceSession?.session?.topic,
          status: recordData.attendanceSession?.session?.status,
        },
        status: recordData.status,
        checkin_time: recordData.checkin_time,
        source: recordData.source,
        latitude: recordData.latitude,
        longitude: recordData.longitude,
        no_gps_reason: recordData.no_gps_reason,
        is_valid: isValidValue, // Use the actual database value
        location_valid: locationValid, // Keep for backward compatibility
        distance_from_class: distance ? Math.round(distance) : null,
      };
    });

    res.json({
      success: true,
      data: {
        class: {
          class_id: classData.class_id,
          class_code: classData.class_code,
          name: classData.name,
          latitude: classData.latitude,
          longitude: classData.longitude,
          location_radius: classData.location_radius || 100,
        },
        records: formattedRecords,
        total: formattedRecords.length,
        stats: {
          present: formattedRecords.filter(r => r.status === 'PRESENT').length,
          late: formattedRecords.filter(r => r.status === 'LATE').length,
          valid_location: formattedRecords.filter(r => r.location_valid === true).length,
          invalid_location: formattedRecords.filter(r => r.location_valid === false).length,
        },
      },
    });
  } catch (error) {
    console.error('Get all attendance records error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
  removeStudent,
  searchStudent,
  getAllAttendanceRecords,
};
