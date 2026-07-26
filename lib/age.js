export function getAge(birthdayStr) {
  if (!birthdayStr) return null;
  // `new Date('YYYY-MM-DD')` parses as UTC midnight, but the getFullYear/
  // getMonth/getDate calls below are local — so west of UTC the date read back
  // is the *previous* day, putting the age out by a year around a birthday.
  // Build the date in local time from the parts instead.
  const [year, month, day] = String(birthdayStr).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const bdate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - bdate.getFullYear();
  const m = today.getMonth() - bdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) {
    age--;
  }
  return age;
}
