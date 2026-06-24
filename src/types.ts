/** Application info from Rust backend */
export interface AppInfo {
  name: string;
  path: string;
  bundleId: string;
  pinyinInitials: string;
  iconPath: string | null;
}

/** Key binding types */
export type Binding =
  | { type: "app"; path: string; name: string }
  | { type: "folder"; path: string; name: string }
  | { type: "url"; url: string; name: string }
  | { type: "action"; action: string; name: string };

/** Key bindings collection */
export interface KeyBindings {
  version: number;
  bindings: Record<string, Binding>;
}

/** User configuration */
export interface Config {
  theme: string;
  hotkey: string;
  autostart: boolean;
  panelWidth: number;
  panelHeight: number;
}

/** Autostart diagnosis info */
export interface AutostartDiagnosis {
  backend: string | null;
  sm_status: string | null;
  in_app_bundle: boolean;
  label: string | null;
  plist_path: string | null;
  plist_exists: boolean;
  launchctl_loaded: boolean;
  agent_target: string | null;
  running_exe: string | null;
}
