/**
 * UTCの日付をJST（日本標準時）に変換します
 */
export const toJST = (date: Date): Date => {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
};

/**
 * 日付からYYYY-MM-DD形式の文字列を取得します（JST）
 */
export const getDateKey = (date: Date): string => {
  const jst = toJST(date);
  return jst.toISOString().split('T')[0];
}; 