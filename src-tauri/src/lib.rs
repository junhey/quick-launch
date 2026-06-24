mod app_index;
mod app_launcher;
mod autostart;
mod commands;
mod hotkey;
mod key_bindings;
mod state;
mod storage;
mod tray;

use state::AppState;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        return;
                    }
                    // Toggle popup on Control+Space
                    tray::toggle_popup(app, None);
                })
                .build(),
        )
        .manage(AppState::default())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            let app_handle = app.handle().clone();
            let state: tauri::State<'_, AppState> = app.state();

            // Load persisted config and key bindings from disk
            storage::load_state_from_disk(&app_handle, &state);

            // Scan applications index
            let apps = app_index::scan_apps();
            *state.app_index.lock() = apps;
            storage::save_app_index(&app_handle, &state.app_index.lock());

            // Build system tray
            tray::build_tray(&app_handle).map_err(|e| e.to_string())?;
            tray::install_focus_lost_hide(&app_handle);

            // Register global shortcut: Control+Space
            if let Some(sc) = hotkey::parse_accelerator("Control+Space") {
                let _ = app.global_shortcut().register(sc);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::hide_popup,
            commands::toggle_popup,
            commands::search_apps,
            commands::launch_app,
            commands::refresh_app_index,
            commands::get_key_bindings,
            commands::set_key_binding,
            commands::remove_key_binding,
            commands::execute_binding,
            commands::get_config,
            commands::set_config,
            commands::export_config,
            commands::import_config,
            commands::autostart_set,
            commands::autostart_get,
            commands::autostart_diagnose,
            commands::autostart_open_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
