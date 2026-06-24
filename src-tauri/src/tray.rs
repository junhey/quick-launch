use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

/// Toggle popup visibility. When showing, center on the active monitor.
pub fn toggle_popup(app: &AppHandle, _tray_rect: Option<tauri::Rect>) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
    } else {
        // Center the window on the current monitor
        if let Ok(Some(monitor)) = win.current_monitor() {
            let mon_pos = monitor.position();
            let mon_size = monitor.size();
            let scale = monitor.scale_factor();
            let win_size = win.outer_size().unwrap_or(tauri::PhysicalSize {
                width: 640,
                height: 400,
            });
            let x = mon_pos.x + (mon_size.width as i32 - win_size.width as i32) / 2;
            let y = mon_pos.y + (mon_size.height as i32 - win_size.height as i32) / 2
                - (40.0 * scale) as i32; // Shift up slightly from center
            let _ = win.set_position(tauri::PhysicalPosition { x, y });
        }

        #[cfg(target_os = "macos")]
        {
            let _ = app.show();
        }
        let _ = win.show();
        let _ = win.set_focus();
        let _ = app.emit("popup:toggle", ());
    }
}

/// Build the system tray icon and menu.
pub fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "显示 Quick Launch", true, Some("Ctrl+Space"))?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, Some("CmdOrCtrl+Q"))?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    // Use a simple template icon for now — will be replaced with custom icon
    let icon =
        tauri::image::Image::new_owned(include_bytes!("../icons/tray-icon.png").to_vec(), 32, 32);

    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Quick Launch — Ctrl+Space")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => toggle_popup(app, None),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => {
                toggle_popup(tray.app_handle(), None);
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// Hide the popup when the window loses focus.
pub fn install_focus_lost_hide(app: &AppHandle) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    let win_handle = win.clone();
    let close_handle = win.clone();
    win.on_window_event(move |event| match event {
        tauri::WindowEvent::Focused(false) => {
            if !win_handle.is_visible().unwrap_or(false) {
                return;
            }
            let w = win_handle.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(150));
                if !w.is_focused().unwrap_or(false) {
                    let _ = w.hide();
                }
            });
        }
        tauri::WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            let _ = close_handle.hide();
        }
        _ => {}
    });
}
