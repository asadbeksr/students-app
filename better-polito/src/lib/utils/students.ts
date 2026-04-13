// Modified from polito/students-app — 2026-04-13
export const getStudentEnrollmentYear = (student?: { firstEnrollmentYear?: number }) => {
  if (!student?.firstEnrollmentYear) return '...';
  return `${student.firstEnrollmentYear - 1}/${student.firstEnrollmentYear}`;
};
