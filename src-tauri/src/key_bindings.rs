use crate::state::Binding;
use crate::app_launcher;

/// Execute a binding action.
pub fn execute(binding: &Binding) -> Result<(), String> {
    match binding {
        Binding::App { path, .. } => app_launcher::launch(path),
        Binding::Folder { path, .. } => app_launcher::open_folder(path),
        Binding::Url { url, .. } => app_launcher::open_url(url),
        Binding::Action { action, .. } => match action.as_str() {
            "lock_screen" => app_launcher::lock_screen(),
            "show_desktop" => app_launcher::show_desktop(),
            "toggle_theme" => {
                // Theme toggle is handled by the frontend
                Ok(())
            }
            _ => Err(format!("Unknown action: {action}")),
        },
    }
}

/// Get the list of available built-in actions.
#[allow(dead_code)]
pub fn available_actions() -> Vec<(String, String)> {
    vec![
        ("lock_screen".to_string(), "锁屏".to_string()),
        ("show_desktop".to_string(), "回桌".to_string()),
        ("toggle_theme".to_string(), "切换主题".to_string()),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn available_actions_not_empty() {
        let actions = available_actions();
        assert!(!actions.is_empty());
        assert!(actions.iter().any(|(id, _)| id == "lock_screen"));
    }
}
