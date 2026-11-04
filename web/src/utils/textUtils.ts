/**
 * Normalize Arabic text to ensure tolerant/fuzzy matching between user typing and master database:
 * - Unifies Alef variants (أ, إ, آ -> ا)
 * - Converts Taa Marbuta (ة -> ه)
 * - Converts Alef Maqsura (ى -> ي)
 * - Strips Tashkeel / Harakat
 * - Lowercases English letters
 */
export const normalizeSearchText = (text?: string | null): string => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Tashkeel
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
};
