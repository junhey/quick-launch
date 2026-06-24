use crate::app_index;
use crate::app_launcher;
use crate::key_bindings;
use crate::state::{AppState, AppInfo, Binding, Config, KeyBindings};
use crate::storage;
use crate::tray;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager, State};

/// Export bundle structure for import/export
#[derive(Serialize, Deserialize)]
struct ExportBundle {
    version: u32,
    config: Config,
    #[serde(rename = "keyBindings")]
    key_bindings: KeyBindings,
}

// ── Popup control ──

#[tauri::command]
pub fn hide_popup(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn toggle_popup(app: AppHandle) {
    tray::toggle_popup(&app, None);
}

// ── App search & launch ──

#[tauri::command]
pub fn search_apps(query: String, state: State<'_, AppState>) -> Vec<AppInfo> {
    let apps = state.app_index.lock();
    if query.is_empty() {
        return Vec::new();
    }

    let query_lower = query.to_lowercase();
    let mut results: Vec<(AppInfo, u32)> = apps
        .iter()
        .filter_map(|app| {
            let name_lower = app.name.to_lowercase();
            let initials_lower = app.pinyin_initials.to_lowercase();

            let score = if name_lower == &query_lower {
                100 // Exact match
            } else if name_lower.starts_with(&query_lower) {
                80 // Prefix match
            } else if app.pinyin_initials == query {
                90 // Exact pinyin initials match
            } else if initials_lower.starts_with(&query_lower) {
                70 // Pinyin initials prefix
            } else if name_lower.contains(&query_lower) {
                50 // Contains
            } else if initials_lower.contains(&query_lower) {
                30 // Pinyin contains
            } else {
                return None;
            };

            Some((app.clone(), score))
        })
        .collect();

    results.sort_by(|a, b| b.1.cmp(&a.1));
    results.into_iter().take(10).map(|(app, _)| app).collect()
}

#[tauri::command]
pub fn launch_app(path: String) -> Result<(), String> {
    app_launcher::launch(&path)
}

#[tauri::command]
pub fn refresh_app_index(app: AppHandle, state: State<'_, AppState>) -> Result<usize, String> {
    let apps = app_index::scan_apps();
    let count = apps.len();
    *state.app_index.lock() = apps.clone();
    storage::save_app_index(&app, &apps);
    Ok(count)
}

// ── Key bindings ──

#[tauri::command]
pub fn get_key_bindings(state: State<'_, AppState>) -> KeyBindings {
    state.key_bindings.lock().clone()
}

#[tauri::command]
pub fn set_key_binding(
    key: String,
    binding: Binding,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut kb = state.key_bindings.lock();
    kb.bindings.insert(key, binding);
    let kb_clone = kb.clone();
    drop(kb);
    storage::save_key_bindings(&app, &kb_clone);
    Ok(())
}

#[tauri::command]
pub fn remove_key_binding(
    key: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut kb = state.key_bindings.lock();
    kb.bindings.remove(&key);
    let kb_clone = kb.clone();
    drop(kb);
    storage::save_key_bindings(&app, &kb_clone);
    Ok(())
}

#[tauri::command]
pub fn execute_binding(key: String, state: State<'_, AppState>) -> Result<(), String> {
    let kb = state.key_bindings.lock();
    let binding = kb
        .bindings
        .get(&key)
        .ok_or_else(|| format!("No binding for key: {key}"))?;
    key_bindings::execute(binding)
}

// ── Config ──

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Config {
    state.config.lock().clone()
}

#[tauri::command]
pub fn set_config(
    config: Config,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    *state.config.lock() = config.clone();
    storage::save_config(&app, &config);
    Ok(())
}

// ── Import / Export ──

#[tauri::command]
pub fn export_config(state: State<'_, AppState>) -> Result<String, String> {
    let bundle = ExportBundle {
        version: 1,
        config: state.config.lock().clone(),
        key_bindings: state.key_bindings.lock().clone(),
    };
    serde_json::to_string_pretty(&bundle).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn import_config(
    json: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let bundle: ExportBundle =
        serde_json::from_str(&json).map_err(|e| format!("Parse error: {e}"))?;
    *state.config.lock() = bundle.config.clone();
    *state.key_bindings.lock() = bundle.key_bindings.clone();
    storage::save_config(&app, &bundle.config);
    storage::save_key_bindings(&app, &bundle.key_bindings);
    Ok(())
}

// ── Autostart ──

#[tauri::command]
pub fn autostart_set(app: AppHandle, enabled: bool) -> Result<(), String> {
    crate::autostart::set_enabled(&app, enabled)
}

#[tauri::command]
pub fn autostart_get(app: AppHandle) -> bool {
    crate::autostart::is_enabled(&app)
}

#[tauri::command]
pub fn autostart_diagnose(app: AppHandle) -> serde_json::Value {
    let d = crate::autostart::diagnose(&app);
    serde_json::to_value(d).unwrap_or(serde_json::Value::Null)
}

#[tauri::command]
pub fn autostart_open_settings() -> Result<(), String> {
    crate::autostart::open_system_login_items()
}
