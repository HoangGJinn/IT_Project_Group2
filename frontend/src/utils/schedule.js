// Utility functions for formatting schedule data
// These functions ensure consistency between teacher and student interfaces

/**
 * Format schedule_days to a readable Vietnamese format
 * Handles both Vietnamese text (e.g., "Thứ 2, Thứ 5") and numeric format (e.g., "2,5")
 * @param {string} scheduleDays - The schedule_days string from database
 * @returns {string} - Formatted schedule days in Vietnamese
 */
export const formatScheduleDays = (scheduleDays) => {
  if (!scheduleDays) return 'Chưa có';
  
  const trimmed = scheduleDays.trim();
  if (!trimmed) return 'Chưa có';
  
  // If already in Vietnamese format, return as is (with proper formatting)
  const dayMap = {
    'chủ nhật': 'Chủ Nhật',
    'thứ 2': 'Thứ 2',
    'thứ 3': 'Thứ 3',
    'thứ 4': 'Thứ 4',
    'thứ 5': 'Thứ 5',
    'thứ 6': 'Thứ 6',
    'thứ 7': 'Thứ 7'
  };
  
  const lowerSchedule = trimmed.toLowerCase();
  
  // Check if it contains Vietnamese day names
  const vietnameseDays = [];
  Object.keys(dayMap).forEach(dayName => {
    if (lowerSchedule.includes(dayName)) {
      vietnameseDays.push(dayMap[dayName]);
    }
  });
  
  if (vietnameseDays.length > 0) {
    // Remove duplicates and sort
    const uniqueDays = [...new Set(vietnameseDays)];
    // Sort by day order: Thứ 2, Thứ 3, ..., Thứ 7, Chủ Nhật
    const dayOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    uniqueDays.sort((a, b) => {
      const indexA = dayOrder.indexOf(a);
      const indexB = dayOrder.indexOf(b);
      return indexA - indexB;
    });
    return uniqueDays.join(', ');
  }
  
  // Try to parse as numbers (e.g., "2,5" or "2, 5" or "2,4,6")
  const numericMatch = trimmed.match(/\d+/g);
  if (numericMatch) {
    const dayNames = {
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
      7: 'Chủ Nhật',
      0: 'Chủ Nhật' // Also handle 0 as Sunday
    };
    
    const days = numericMatch
      .map(d => parseInt(d))
      .filter(d => d >= 0 && d <= 7)
      .map(d => dayNames[d === 0 ? 7 : d])
      .filter(Boolean);
    
    // Remove duplicates
    const uniqueDays = [...new Set(days)];
    if (uniqueDays.length > 0) {
      // Sort by day order
      const dayOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
      uniqueDays.sort((a, b) => {
        const indexA = dayOrder.indexOf(a);
        const indexB = dayOrder.indexOf(b);
        return indexA - indexB;
      });
      return uniqueDays.join(', ');
    }
  }
  
  // If we can't parse it, return the original string
  return trimmed;
};

/**
 * Format schedule_periods to a readable format
 * Handles formats like "7->10", "7-10", "7", etc.
 * @param {string} schedulePeriods - The schedule_periods string from database
 * @returns {string} - Formatted schedule periods
 */
export const formatSchedulePeriods = (schedulePeriods) => {
  if (!schedulePeriods) return 'Chưa có';
  
  const trimmed = schedulePeriods.trim();
  if (!trimmed) return 'Chưa có';
  
  // Try to match range format (e.g., "7->10", "7-10", "7 -> 10", "7 - 10")
  const rangeMatch = trimmed.match(/(\d+)\s*[->-]\s*(\d+)/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    if (start && end && start <= end) {
      return `${start}-${end}`;
    }
  }
  
  // Try to match single period (e.g., "7")
  const singleMatch = trimmed.match(/(\d+)/);
  if (singleMatch) {
    return singleMatch[1];
  }
  
  // If we can't parse it, return the original string
  return trimmed;
};

