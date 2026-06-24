import { describe, it, expect } from "vitest";
import { KEY_LAYOUT, TOTAL_KEYS, BUILTIN_ACTIONS } from "../constants";

describe("KEY_LAYOUT", () => {
  it("has 4 rows", () => {
    expect(KEY_LAYOUT).toHaveLength(4);
  });

  it("has 10 keys per row", () => {
    for (const row of KEY_LAYOUT) {
      expect(row).toHaveLength(10);
    }
  });

  it("contains QWERTY top row", () => {
    expect(KEY_LAYOUT[1]).toEqual([
      "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
    ]);
  });

  it("contains number row", () => {
    expect(KEY_LAYOUT[0]).toEqual([
      "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
    ]);
  });

  it("has exactly TOTAL_KEYS keys", () => {
    const total = KEY_LAYOUT.flat().length;
    expect(total).toBe(TOTAL_KEYS);
  });

  it("has no duplicate keys", () => {
    const all = KEY_LAYOUT.flat();
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });
});

describe("BUILTIN_ACTIONS", () => {
  it("includes lock_screen", () => {
    expect(BUILTIN_ACTIONS.some((a) => a.id === "lock_screen")).toBe(true);
  });

  it("includes show_desktop", () => {
    expect(BUILTIN_ACTIONS.some((a) => a.id === "show_desktop")).toBe(true);
  });

  it("includes toggle_theme", () => {
    expect(BUILTIN_ACTIONS.some((a) => a.id === "toggle_theme")).toBe(true);
  });

  it("each action has id, name, and icon", () => {
    for (const action of BUILTIN_ACTIONS) {
      expect(action.id).toBeTruthy();
      expect(action.name).toBeTruthy();
      expect(action.icon).toBeTruthy();
    }
  });
});
