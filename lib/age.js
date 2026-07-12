export function getAge(birthdayStr) {
  if (!birthdayStr) return null;
  const bdate = new Date(birthdayStr);
  const today = new Date();
  let age = today.getFullYear() - bdate.getFullYear();
  const m = today.getMonth() - bdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) {
    age--;
  }
  return age;
}
