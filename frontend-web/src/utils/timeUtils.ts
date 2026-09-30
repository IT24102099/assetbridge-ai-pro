/**
 * Normalizes an HTML time string ("HH:mm") into a .NET TimeSpan-compatible string ("HH:mm:ss").
 * Preserves already normalized ("HH:mm:ss") and empty/invalid values without silent corruption.
 */
export const toTimeSpanString = (time: string): string => {
  if (!time) return time;
  if (time.length === 5 && /^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00`;
  }
  return time;
};
