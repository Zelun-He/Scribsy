/**
 * Utility functions for date handling to avoid timezone issues
 */

/**
 * Safely formats a date string (YYYY-MM-DD) to a locale date string
 * without timezone conversion issues
 */
export function formatDateString(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  
  // Parse the date string manually to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
  
  // Create a Date object in local timezone
  const date = new Date(year, month - 1, day); // month is 0-indexed
  
  // Use provided options or default to locale date string
  return date.toLocaleDateString('en-US', options || {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * Safely formats a date string to show just the date part (MM/DD/YYYY)
 */
export function formatDateOnly(dateString: string): string {
  return formatDateString(dateString);
}

/**
 * Safely formats a date string to show full date (Month DD, YYYY)
 */
export function formatDateFull(dateString: string): string {
  return formatDateString(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calculate age from a date of birth string
 */
export function calculateAge(dateOfBirthString: string): number {
  if (!dateOfBirthString) return 0;
  
  const [year, month, day] = dateOfBirthString.split('-').map(num => parseInt(num, 10));
  const dob = new Date(year, month - 1, day);
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  
  if (!hasHadBirthdayThisYear) age -= 1;
  
  return age;
}

/**
 * Format date of birth with age calculation
 */
export function formatDateOfBirthWithAge(dateOfBirthString: string): string {
  if (!dateOfBirthString) return '';
  
  const age = calculateAge(dateOfBirthString);
  const formattedDate = formatDateOnly(dateOfBirthString);
  
  return `${formattedDate} (${age} years)`;
}

/**
 * Calculate age from ISO date string (legacy function name)
 */
export function calculateAgeFromISO(dateString: string): number {
  return calculateAge(dateString);
}

/**
 * Format local date (legacy function name)
 */
export function formatLocalDate(dateString: string): string {
  return formatDateFull(dateString);
}