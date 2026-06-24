import { describe, it, expect } from "vitest";
import { fuzzyMatch, fuzzySearch } from "../utils/fuzzy";

describe("fuzzyMatch", () => {
  it("returns 100 for exact match", () => {
    expect(fuzzyMatch("safari", "safari")).toBe(100);
  });

  it("returns 80 for prefix match", () => {
    expect(fuzzyMatch("saf", "safari")).toBe(80);
  });

  it("returns 50 for contains match", () => {
    expect(fuzzyMatch("far", "safari")).toBe(50);
  });

  it("returns 30 for fuzzy sequence match", () => {
    expect(fuzzyMatch("sfr", "safari")).toBe(30);
  });

  it("returns -1 for no match", () => {
    expect(fuzzyMatch("xyz", "safari")).toBe(-1);
  });

  it("is case insensitive", () => {
    expect(fuzzyMatch("SAFARI", "safari")).toBe(100);
    expect(fuzzyMatch("safari", "SAFARI")).toBe(100);
  });
});

describe("fuzzySearch", () => {
  const items = ["Safari", "Firefox", "Chrome", "VS Code"];

  it("returns empty for empty query", () => {
    expect(fuzzySearch("", items, (s) => s)).toEqual([]);
  });

  it("returns sorted results", () => {
    const results = fuzzySearch("s", items, (s) => s);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
  });

  it("matches by prefix first", () => {
    const results = fuzzySearch("saf", items, (s) => s);
    expect(results[0].item).toBe("Safari");
  });
});
