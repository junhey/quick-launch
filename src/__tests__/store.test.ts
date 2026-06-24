import { describe, it, expect } from "vitest";
import { useStore } from "../store";

describe("useStore", () => {
  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.panelVisible).toBe(false);
    expect(state.view).toBe("launcher");
    expect(state.searchMode).toBe(false);
    expect(state.searchQuery).toBe("");
    expect(state.searchResults).toEqual([]);
    expect(state.selectedIndex).toBe(0);
    expect(state.keyBindings).toEqual({});
    expect(state.theme).toBe("auto");
    expect(state.editingKey).toBeNull();
  });

  it("setPanelVisible updates state", () => {
    useStore.getState().setPanelVisible(true);
    expect(useStore.getState().panelVisible).toBe(true);
    useStore.getState().setPanelVisible(false);
    expect(useStore.getState().panelVisible).toBe(false);
  });

  it("setSearchMode toggles search mode", () => {
    useStore.getState().setSearchMode(true);
    expect(useStore.getState().searchMode).toBe(true);
    useStore.getState().setSearchMode(false);
    expect(useStore.getState().searchMode).toBe(false);
  });

  it("setSearchQuery updates query", () => {
    useStore.getState().setSearchQuery("test");
    expect(useStore.getState().searchQuery).toBe("test");
  });

  it("setSearchResults updates results and resets index", () => {
    const mockResults = [
      { name: "Safari", path: "/Applications/Safari.app", bundleId: "", pinyinInitials: "S", iconPath: null },
    ];
    useStore.getState().setSelectedIndex(5);
    useStore.getState().setSearchResults(mockResults);
    expect(useStore.getState().searchResults).toEqual(mockResults);
    expect(useStore.getState().selectedIndex).toBe(0);
  });

  it("setKeyBindings updates bindings", () => {
    const bindings = {
      Q: { type: "app" as const, path: "/Applications/Safari.app", name: "Safari" },
    };
    useStore.getState().setKeyBindings(bindings);
    expect(useStore.getState().keyBindings).toEqual(bindings);
  });

  it("setTheme updates theme", () => {
    useStore.getState().setTheme("dark");
    expect(useStore.getState().theme).toBe("dark");
    useStore.getState().setTheme("auto");
  });

  it("setEditingKey updates editing key", () => {
    useStore.getState().setEditingKey("Q");
    expect(useStore.getState().editingKey).toBe("Q");
    useStore.getState().setEditingKey(null);
  });

  it("resetSearch clears search state", () => {
    useStore.getState().setSearchMode(true);
    useStore.getState().setSearchQuery("test");
    useStore.getState().setSearchResults([
      { name: "A", path: "/", bundleId: "", pinyinInitials: "A", iconPath: null },
    ]);
    useStore.getState().setSelectedIndex(3);

    useStore.getState().resetSearch();

    expect(useStore.getState().searchMode).toBe(false);
    expect(useStore.getState().searchQuery).toBe("");
    expect(useStore.getState().searchResults).toEqual([]);
    expect(useStore.getState().selectedIndex).toBe(0);
  });
});
