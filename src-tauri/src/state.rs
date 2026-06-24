use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// User-facing configuration persisted in config.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub theme: String,
    #[serde(rename = "hotkey")]
    pub hotkey: String,
    pub autostart: bool,
    #[serde(rename = "panelWidth", default = "default_panel_width")]
    pub panel_width: u32,
    #[serde(rename = "panelHeight", default = "default_panel_height")]
    pub panel_height: u32,
}

fn default_panel_width() -> u32 {
    640
}
fn default_panel_height() -> u32 {
    400
}

impl Default for Config {
    fn default() -> Self {
        Config {
            theme: "auto".to_string(),
            hotkey: "Control+Space".to_string(),
            autostart: false,
            panel_width: 640,
            panel_height: 400,
        }
    }
}

/// Information about a scanned macOS application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub path: String,
    #[serde(rename = "bundleId", default)]
    pub bundle_id: String,
    #[serde(rename = "pinyinInitials", default)]
    pub pinyin_initials: String,
    #[serde(rename = "iconPath", default, skip_serializing_if = "Option::is_none")]
    pub icon_path: Option<String>,
}

/// A key binding entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Binding {
    #[serde(rename = "app")]
    App { path: String, name: String },
    #[serde(rename = "folder")]
    Folder { path: String, name: String },
    #[serde(rename = "url")]
    Url { url: String, name: String },
    #[serde(rename = "action")]
    Action { action: String, name: String },
}

/// Key bindings collection
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct KeyBindings {
    pub version: u32,
    pub bindings: HashMap<String, Binding>,
}

#[derive(Default)]
pub struct AppState {
    pub config: Arc<Mutex<Config>>,
    pub key_bindings: Arc<Mutex<KeyBindings>>,
    pub app_index: Arc<Mutex<Vec<AppInfo>>>,
}
