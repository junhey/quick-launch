use crate::state::{AppInfo, AppState, Config, KeyBindings};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

const CONFIG_FILE: &str = "config.json";
const KEYBINDINGS_FILE: &str = "keybindings.json";
const APP_INDEX_FILE: &str = "app_index.json";

pub fn data_dir(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir());
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn load_state_from_disk(app: &AppHandle, state: &AppState) {
    // Load config
    let config_path = data_dir(app).join(CONFIG_FILE);
    if let Ok(s) = std::fs::read_to_string(&config_path) {
        if let Ok(cfg) = serde_json::from_str::<Config>(&s) {
            *state.config.lock() = cfg;
        }
    }

    // Load key bindings
    let kb_path = data_dir(app).join(KEYBINDINGS_FILE);
    if let Ok(s) = std::fs::read_to_string(&kb_path) {
        if let Ok(kb) = serde_json::from_str::<KeyBindings>(&s) {
            *state.key_bindings.lock() = kb;
        }
    }

    // Load app index cache
    let idx_path = data_dir(app).join(APP_INDEX_FILE);
    if let Ok(s) = std::fs::read_to_string(&idx_path) {
        if let Ok(apps) = serde_json::from_str::<Vec<AppInfo>>(&s) {
            *state.app_index.lock() = apps;
        }
    }
}

pub fn save_config(app: &AppHandle, config: &Config) {
    let path = data_dir(app).join(CONFIG_FILE);
    if let Ok(json) = serde_json::to_string_pretty(config) {
        let _ = std::fs::write(path, json);
    }
}

pub fn save_key_bindings(app: &AppHandle, kb: &KeyBindings) {
    let path = data_dir(app).join(KEYBINDINGS_FILE);
    if let Ok(json) = serde_json::to_string_pretty(kb) {
        let _ = std::fs::write(path, json);
    }
}

pub fn save_app_index(app: &AppHandle, apps: &[AppInfo]) {
    let path = data_dir(app).join(APP_INDEX_FILE);
    if let Ok(json) = serde_json::to_string_pretty(apps) {
        let _ = std::fs::write(path, json);
    }
}
