/** 38-key layout: 4 rows of 10 keys each */
export const KEY_LAYOUT: string[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
];

/** Total number of keys */
export const TOTAL_KEYS = 40;

/** Available built-in actions */
export const BUILTIN_ACTIONS: { id: string; name: string; icon: string }[] = [
  { id: "lock_screen", name: "锁屏", icon: "🔒" },
  { id: "show_desktop", name: "回桌", icon: "🖥" },
  { id: "toggle_theme", name: "切换主题", icon: "🌓" },
];
