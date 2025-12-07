/**
 * Utility functions for academic year and semester
 */

/**
 * Generate list of academic years
 * Format: YYYY-YYYY+1 (e.g., 2023-2024)
 * Returns years from currentYear - 2 to currentYear + 3
 */
export const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];

  // Generate from 2 years ago to 3 years ahead
  for (let i = -2; i <= 3; i++) {
    const startYear = currentYear + i;
    const endYear = startYear + 1;
    years.push({
      value: `${startYear}-${endYear}`,
      label: `${startYear}-${endYear}`,
    });
  }

  return years;
};

/**
 * Get list of semesters
 */
export const getSemesters = () => {
  return [
    { value: 'HK1', label: 'Học Kì 1', displayValue: '1' },
    { value: 'HK2', label: 'Học Kì 2', displayValue: '2' },
    { value: 'HK3', label: 'Học Kì 3 (Hè)', displayValue: '3' },
  ];
};

/**
 * Convert semester display value to backend value
 * @param {string} displayValue - '1', '2', or '3'
 * @returns {string} - 'HK1', 'HK2', or 'HK3'
 */
export const semesterDisplayToBackend = displayValue => {
  const mapping = {
    1: 'HK1',
    2: 'HK2',
    3: 'HK3',
  };
  return mapping[displayValue] || displayValue;
};

/**
 * Convert semester backend value to display value
 * @param {string} backendValue - 'HK1', 'HK2', or 'HK3'
 * @returns {string} - '1', '2', or '3'
 */
export const semesterBackendToDisplay = backendValue => {
  const mapping = {
    HK1: '1',
    HK2: '2',
    HK3: '3',
  };
  return mapping[backendValue] || backendValue;
};
