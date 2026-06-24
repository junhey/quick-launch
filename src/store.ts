import { create } from "zustand";
import type { AppInfo, Binding, Config, KeyBindings } from "./types";

type Theme = "light" | "dark" | "auto";
type View = "launcher" | "settings";

interface Store {
  // Panel state
  panelVisible: boolean;
  view: View;

  // Search state
  searchMode: boolean;
  searchQuery: string;
  searchResults: AppInfo[];
  selectedIndex: number;

  // Key bindings
  keyBindings: Record<string, Binding>;

  // Config
  config: Config | null;
  theme: Theme;

  // Binding editor
  editingKey: string | null;

  // Actions
  setPanelVisible: (visible: boolean) => void;
  setView: (view: View) => void;
  setSearchMode: (mode: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: AppInfo[]) => void;
  setSelectedIndex: (index: number) => void;
  setKeyBindings: (bindings: Record<string, Binding>) => void;
  setConfig: (config: Config) => void;
  setTheme: (theme: Theme) => void;
  setEditingKey: (key: string | null) => void;
  resetSearch: () => void;
}

export const useStore = create<Store>((set) => ({
  panelVisible: false,
  view: "launcher",
  searchMode: false,
  searchQuery: "",
  searchResults: [],
  selectedIndex: 0,
  keyBindings: {},
  config: null,
  theme: "auto",
  editingKey: null,

  setPanelVisible: (visible) => set({ panelVisible: visible }),
  setView: (view) => set({ view }),
  setSearchMode: (mode) => set({ searchMode: mode, searchQuery: "", searchResults: [], selectedIndex: 0 }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results, selectedIndex: 0 }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setKeyBindings: (bindings) => set({ keyBindings: bindings }),
  setConfig: (config) => set({ config, theme: config.theme as Theme }),
  setTheme: (theme) => set({ theme }),
  setEditingKey: (key) => set({ editingKey: key }),
  resetSearch: () =>
    set({ searchMode: false, searchQuery: "", searchResults: [], selectedIndex: 0 }),
}));
