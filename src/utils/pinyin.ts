/**
 * Simple pinyin initials extraction for Chinese app names.
 * This is a frontend mirror of the Rust `get_pinyin_initials` function.
 * For production use, consider a proper pinyin library.
 */

// Common CJK character to pinyin initial mapping
const CJK_PINYIN_MAP: Record<string, string> = {
  "微": "W", "信": "X", "访": "F", "达": "D",
  "系": "X", "统": "T", "偏": "P", "好": "H",
  "设": "S", "置": "Z", "腾": "T", "讯": "X",
  "会": "H", "议": "Y", "快": "K", "播": "B",
  "放": "F", "器": "Q", "音": "Y", "乐": "L",
  "导": "D", "航": "H", "图": "T", "片": "P",
  "阅": "Y", "读": "D", "文": "W", "档": "D",
  "备": "B", "忘": "W", "录": "L", "日": "R",
  "历": "L", "计": "J", "算": "S", "机": "J",
  "网": "W", "络": "L", "应": "Y", "用": "Y",
  "商": "S", "店": "D", "邮": "Y", "件": "J",
  "地": "D", "址": "Z", "联": "L", "人": "R",
  "消": "X", "息": "X", "输": "S", "入": "R",
  "法": "F", "下": "X", "载": "Z", "桌": "Z",
  "面": "M", "浏": "L", "览": "L", "搜": "S",
  "索": "S", "开": "K", "发": "F", "工": "G",
  "具": "J", "终": "Z", "端": "D", "编": "B",
  "辑": "J", "书": "S", "签": "Q", "收": "S",
  "藏": "C", "剪": "J", "切": "Q", "截": "J",
  "屏": "P", "制": "Z", "改": "G",
};

/**
 * Extract pinyin initials from a string.
 * - ASCII alphabetic characters are uppercased
 * - CJK characters are mapped to their pinyin initial
 * - Other characters are passed through
 */
export function getPinyinInitials(s: string): string {
  let result = "";
  for (const c of s) {
    if (c.charCodeAt(0) < 128) {
      // ASCII: include letters and digits
      if (/[a-zA-Z0-9]/.test(c)) {
        result += c.toUpperCase();
      }
    } else {
      // CJK or other
      result += CJK_PINYIN_MAP[c] ?? c;
    }
  }
  return result;
}
