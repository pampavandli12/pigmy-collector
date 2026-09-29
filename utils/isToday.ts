export function isToday(timestamp: number, now = new Date()) {
  const date = new Date(timestamp);

  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
