import { describe, it, expect } from "vitest";
import { getPinyinInitials } from "../utils/pinyin";

describe("getPinyinInitials", () => {
  it("extracts initials from Chinese app names", () => {
    expect(getPinyinInitials("微信")).toBe("WX");
    expect(getPinyinInitials("访达")).toBe("FD");
  });

  it("passes through English names uppercased", () => {
    expect(getPinyinInitials("Safari")).toBe("SAFARI");
    expect(getPinyinInitials("Xcode")).toBe("XCODE");
  });

  it("handles mixed Chinese-English names", () => {
    expect(getPinyinInitials("腾讯会议")).toBe("TXHY");
    expect(getPinyinInitials("系统设置")).toBe("XTSZ");
  });

  it("handles empty string", () => {
    expect(getPinyinInitials("")).toBe("");
  });

  it("handles numbers and symbols", () => {
    expect(getPinyinInitials("1Password")).toBe("1PASSWORD");
    expect(getPinyinInitials("Chrome 2")).toBe("CHROME2");
  });
});
