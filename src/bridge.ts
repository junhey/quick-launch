import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AppInfo, Binding, Config, KeyBindings } from "./types";

export const bridge = {
  // ── Popup ──
  async hidePopup(): Promise<void> {
    await invoke("hide_popup");
  },
  async togglePopup(): Promise<void> {
    await invoke("toggle_popup");
  },
  onPopupToggle(cb: () => void): Promise<UnlistenFn> {
    return listen("popup:toggle", () => cb());
  },

  // ── App search ──
  async searchApps(query: string): Promise<AppInfo[]> {
    return await invoke<AppInfo[]>("search_apps", { query });
  },
  async launchApp(path: string): Promise<void> {
    await invoke("launch_app", { path });
  },
  async refreshAppIndex(): Promise<number> {
    return await invoke<number>("refresh_app_index");
  },

  // ── Key bindings ──
  async getKeyBindings(): Promise<KeyBindings> {
    return await invoke<KeyBindings>("get_key_bindings");
  },
  async setKeyBinding(key: string, binding: Binding): Promise<void> {
    await invoke("set_key_binding", { key, binding });
  },
  async removeKeyBinding(key: string): Promise<void> {
    await invoke("remove_key_binding", { key });
  },
  async executeBinding(key: string): Promise<void> {
    await invoke("execute_binding", { key });
  },

  // ── Config ──
  async getConfig(): Promise<Config> {
    return await invoke<Config>("get_config");
  },
  async setConfig(config: Config): Promise<void> {
    await invoke("set_config", { config });
  },

  // ── Import / Export ──
  async exportConfig(): Promise<string> {
    return await invoke<string>("export_config");
  },
  async importConfig(json: string): Promise<void> {
    await invoke("import_config", { json });
  },

  // ── Autostart ──
  async autostartSet(enabled: boolean): Promise<void> {
    await invoke("autostart_set", { enabled });
  },
  async autostartGet(): Promise<boolean> {
    return await invoke<boolean>("autostart_get");
  },
  async autostartOpenSettings(): Promise<void> {
    await invoke("autostart_open_settings");
  },
};
