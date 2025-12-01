const { Class, Session, Teacher, User, Course } = require('../models');
const { Op } = require('sequelize');

const getDayName = (day) => {
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[day];
};

// Helper function to convert period to time
const periodToTime = (period) => {
  if (period <= 4) return `${6 + period}:00`;
  if (period <= 6) return `${period + 4}:00`;
  if (period <= 10) return `${period}:00`;
  return `${period - 2}:00`;
};

// Helper function to parse schedule_days (e.g., "Thứ 2, Thứ 5" or "2,5")
const parseScheduleDays = (scheduleDays) => {
  if (!scheduleDays) return [];
  
  const days = [];
  const lowerSchedule = scheduleDays.toLowerCase().trim();
  
  // First, try to parse Vietnamese day names
  const dayMap = {
    'chủ nhật': 7,  // Sunday -> 7 (to match our display format)
    'thứ 2': 1,     // Monday -> 1
    'thứ 3': 2,     // Tuesday -> 2
    'thứ 4': 3,     // Wednesday -> 3
    'thứ 5': 4,     // Thursday -> 4
    'thứ 6': 5,     // Friday -> 5
    'thứ 7': 6      // Saturday -> 6
  };
  
  // Check for Vietnamese day names first
  let foundVietnamese = false;
  Object.keys(dayMap).forEach(dayName => {
    if (lowerSchedule.includes(dayName)) {
      days.push(dayMap[dayName]);
      foundVietnamese = true;
    }
  });
  
  // If Vietnamese names found, return them
  if (foundVietnamese) {
    return days;
  }
  
  // Otherwise, try to parse as numbers (e.g., "2,4,6" or "2, 4, 6")
  // Note: In our system, 1=Monday, 2=Tuesday, ..., 7=Sunday
  const numericMatch = lowerSchedule.match(/\d+/g);
  if (numericMatch) {
    return numericMatch.map(d => {
      const num = parseInt(d);
      // Convert 0 to 7 (Sunday)
      return num === 0 ? 7 : num;
    });
  }
  
  return days;
};

// Helper function to parse schedule_periods (e.g., "7->10" or "7-10")
const parseSchedulePeriods = (schedulePeriods) => {
  if (!schedulePeriods) return null;
  
  const match = schedulePeriods.match(/(\d+)[\s\->]+(\d+)/);
  if (match) {
    return {
      start: parseInt(match[1]),
      end: parseInt(match[2])
    };
  }
  
  // Single period
  const singleMatch = schedulePeriods.match(/(\d+)/);
  if (singleMatch) {
    const period = parseInt(singleMatch[1]);
    return { start: period, end: period };
  }
  
  return null;
};

const getSchedule = async (req, res) => {
  try {
    const { week_start, week_end } = req.query;

    const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        message: 'User is not a teacher'
      });
    }

    const classes = await Class.findAll({
      where: { teacher_id: teacher.teacher_id },
      attributes: ['class_id', 'class_code', 'name', 'schedule_days', 'schedule_periods', 'start_date', 'end_date', 'teacher_id'],
      include: [{
        model: Course,
        as: 'course',
        attributes: ['course_id', 'code', 'name']
      }]
    });

    const classIds = classes.map(c => c.class_id);

    if (classIds.length === 0) {
      return res.json({
        success: true,
        data: {
          week_start: week_start || null,
          week_end: week_end || null,
          schedule: []
        }
      });
    }

    // Get actual sessions
    let where = { class_id: { [Op.in]: classIds } };
    if (week_start && week_end) {
      where.date = {
        [Op.between]: [week_start, week_end]
      };
    }

    const sessions = await Session.findAll({
      where,
      include: [{
        model: Class,
        as: 'class',
        attributes: ['class_id', 'class_code', 'name', 'schedule_days', 'schedule_periods'],
        include: [{
          model: Course,
          as: 'course',
          attributes: ['course_id', 'code', 'name']
        }]
      }],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    // Create a map of existing sessions by date and class_id
    const existingSessionsMap = new Map();
    sessions.forEach(session => {
      const key = `${session.date}_${session.class_id}`;
      existingSessionsMap.set(key, session);
    });

    // Group by day of week (0 = Sunday, 1 = Monday, etc.)
    // But we want to display Monday (1) first, so we'll adjust
    const schedule = {};
    
    // Process actual sessions
    sessions.forEach(session => {
      const date = new Date(session.date);
      let day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Convert to our display format: 0 = Monday, 6 = Sunday
      // This matches the frontend daysOfWeek array
      const displayDay = day === 0 ? 6 : day - 1;
      
      if (!schedule[displayDay]) {
        schedule[displayDay] = [];
      }

      // Format time
      const formatTime = (time) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        return `${hours}:${minutes}`;
      };

      // Get periods from schedule_periods or calculate from time
      let periods = session.class.schedule_periods || '';
      if (!periods && session.start_time) {
        // Try to estimate periods from time (rough estimate)
        const hour = parseInt(session.start_time.split(':')[0]);
        if (hour >= 7 && hour <= 10) periods = '1-4';
        else if (hour >= 10 && hour <= 12) periods = '5-6';
        else if (hour >= 13 && hour <= 16) periods = '7-10';
        else if (hour >= 16 && hour <= 18) periods = '11-12';
      }

      schedule[displayDay].push({
        session_id: session.session_id,
        class_id: session.class.class_id,
        class_code: session.class.class_code,
        class_name: session.class.name,
        course_name: session.class.course?.name || 'N/A',
        course_code: session.class.course?.code || 'N/A',
        room: session.room || 'Chưa có',
        start_time: formatTime(session.start_time),
        end_time: formatTime(session.end_time),
        periods: periods,
        date: session.date,
        status: session.status,
        topic: session.topic,
        is_scheduled: true // Mark as actual session
      });
    });

    // Generate schedule items from class schedule_days and schedule_periods
    if (week_start && week_end) {
      const startDate = new Date(week_start);
      const endDate = new Date(week_end);
      
      classes.forEach(classItem => {
        if (!classItem.schedule_days || !classItem.schedule_periods) {
          return; // Skip classes without schedule info
        }

        const scheduleDays = parseScheduleDays(classItem.schedule_days);
        const schedulePeriods = parseSchedulePeriods(classItem.schedule_periods);
        
        if (scheduleDays.length === 0 || !schedulePeriods) {
          return;
        }

        // Generate time from periods
        const startTime = periodToTime(schedulePeriods.start);
        const endPeriod = schedulePeriods.end || schedulePeriods.start;
        const endTime = periodToTime(endPeriod + 1);

        // Determine the actual date range to iterate
        // If class has start_date/end_date, use them; otherwise use week range
        let iterStartDate, iterEndDate;
        
        if (classItem.start_date || classItem.end_date) {
          // Class has date range - use intersection with week range
          const classStartDateStr = classItem.start_date;
          const classEndDateStr = classItem.end_date;
          
          // Compare date strings directly (YYYY-MM-DD format)
          if (classEndDateStr && week_end < classStartDateStr) {
            return;
          }
          if (classStartDateStr && week_start > classEndDateStr) {
            return;
          }
          
          // Determine iteration range: intersection of class date range and week range
          iterStartDate = classStartDateStr && classStartDateStr > week_start ? classStartDateStr : week_start;
          iterEndDate = classEndDateStr && classEndDateStr < week_end ? classEndDateStr : week_end;
        } else {
          // No date range - use week range
          iterStartDate = week_start;
          iterEndDate = week_end;
        }

        // Iterate through each day in the date range
        // Convert date strings to Date objects for iteration
        const iterStart = new Date(iterStartDate + 'T00:00:00');
        const iterEnd = new Date(iterEndDate + 'T23:59:59');
        
        for (let d = new Date(iterStart); d <= iterEnd; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // Convert Sunday (0) to 7
          
          // Check if this day matches the schedule
          if (scheduleDays.includes(dayOfWeek)) {
            const dateStr = d.toISOString().split('T')[0];
            const key = `${dateStr}_${classItem.class_id}`;
            
            // Only add if there's no actual session for this date and class
            if (!existingSessionsMap.has(key)) {
              const displayDay = dayOfWeek === 7 ? 6 : dayOfWeek - 1; // Convert to display format
              
              if (!schedule[displayDay]) {
                schedule[displayDay] = [];
              }

              schedule[displayDay].push({
                session_id: null, // No actual session yet
                class_id: classItem.class_id,
                class_code: classItem.class_code,
                class_name: classItem.name,
                course_name: classItem.course?.name || 'N/A',
                course_code: classItem.course?.code || 'N/A',
                room: 'Chưa có',
                start_time: startTime,
                end_time: endTime,
                periods: schedulePeriods.end ? `${schedulePeriods.start}-${schedulePeriods.end}` : `${schedulePeriods.start}`,
                date: dateStr,
                status: 'SCHEDULED',
                topic: null,
                is_scheduled: true // Mark as scheduled (will be displayed with normal color)
              });
            }
          }
        }
      });
    }

    // Sort sessions by time within each day
    Object.keys(schedule).forEach(day => {
      schedule[day].sort((a, b) => {
        if (a.start_time && b.start_time) {
          return a.start_time.localeCompare(b.start_time);
        }
        return 0;
      });
    });

    // Convert to array format for frontend
    const scheduleArray = [];
    for (let i = 0; i < 7; i++) {
      scheduleArray.push({
        day: i,
        sessions: schedule[i] || []
      });
    }

    res.json({
      success: true,
      data: {
        week_start: week_start || null,
        week_end: week_end || null,
        schedule: scheduleArray
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getSchedule
};


