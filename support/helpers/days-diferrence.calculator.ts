export function getDateDifferenceInDays(
  startDate: Date,
  endDate: Date,
): number {
  // Create "pure date" versions of both dates (strip time)
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  const end = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / millisecondsPerDay);
}
