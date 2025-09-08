export function parseLocalYMD(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const base = dateStr.split('T')[0];
  const parts = base.split('-').map((p) => parseInt(p, 10));
  const [y, m, d] = [parts[0], parts[1] || 1, parts[2] || 1];
  return new Date(y, m - 1, d);
}

export function calculateAgeFromISO(dateStr: string, now: Date = new Date()): number {
  const dob = parseLocalYMD(dateStr);
  if (isNaN(dob.getTime())) return 0;
  let age = now.getFullYear() - dob.getFullYear();
  const hasBirthday = now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasBirthday) age -= 1;
  return age;
}

export function formatLocalDate(dateStr: string): string {
  const d = parseLocalYMD(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}


