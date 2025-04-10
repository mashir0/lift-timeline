const formatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// export const utcToJst = (date: Date): Date => {
//   return new Date(formatter.format(date));
// };

export const utcToJst = (date: Date): string => {
  return formatter.format(date);
};
