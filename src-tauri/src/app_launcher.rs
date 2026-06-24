use std::process::Command;

/// Launch an application by its path using macOS `open` command.
pub fn launch(path: &str) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to launch {path}: {e}"))?;
    Ok(())
}

/// Open a folder in Finder.
pub fn open_folder(path: &str) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open folder {path}: {e}"))?;
    Ok(())
}

/// Open a URL in the default browser.
pub fn open_url(url: &str) -> Result<(), String> {
    Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| format!("Failed to open URL {url}: {e}"))?;
    Ok(())
}

/// Lock the screen (macOS).
pub fn lock_screen() -> Result<(), String> {
    Command::new("pmset")
        .args(["displaysleepnow"])
        .spawn()
        .map_err(|e| format!("Failed to lock screen: {e}"))?;
    Ok(())
}

/// Show the desktop (macOS: use Mission Control via F11 equivalent).
pub fn show_desktop() -> Result<(), String> {
    // Use AppleScript to show desktop
    Command::new("osascript")
        .args(["-e", "tell application \"System Events\" to key code 103"])
        .spawn()
        .map_err(|e| format!("Failed to show desktop: {e}"))?;
    Ok(())
}
