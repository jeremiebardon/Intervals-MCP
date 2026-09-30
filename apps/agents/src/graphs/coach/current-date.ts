export function currentDateLine(now: Date): string {
  const weekday = now.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
  return `Today's date: ${weekday} ${now.toISOString().slice(0, 10)}`;
}
