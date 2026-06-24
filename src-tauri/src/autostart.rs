//! Native macOS autostart — SMAppService (preferred) with LaunchAgent fallback.
//! Adapted from clipsync's autostart module.

use serde::Serialize;

#[cfg(target_os = "macos")]
use std::{fs, io::Write, path::PathBuf, process::Command};

#[cfg(target_os = "macos")]
#[link(name = "ServiceManagement", kind = "framework")]
extern "C" {}

#[cfg(target_os = "macos")]
fn is_in_app_bundle() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.canonicalize().ok())
        .map(|p| p.to_string_lossy().contains(".app/Contents/MacOS/"))
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
mod sm {
    use objc2::msg_send;
    use objc2::runtime::{AnyClass, AnyObject};
    use std::ffi::CStr;

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Status {
        NotRegistered,
        Enabled,
        RequiresApproval,
        NotFound,
    }

    impl Status {
        pub fn as_str(self) -> &'static str {
            match self {
                Status::NotRegistered => "not_registered",
                Status::Enabled => "enabled",
                Status::RequiresApproval => "requires_approval",
                Status::NotFound => "not_found",
            }
        }
    }

    fn class() -> Option<&'static AnyClass> {
        AnyClass::get(c"SMAppService")
    }

    pub fn available() -> bool {
        class().is_some()
    }

    unsafe fn main_app_service() -> Option<*mut AnyObject> {
        let cls = class()?;
        let svc: *mut AnyObject = unsafe { msg_send![cls, mainAppService] };
        if svc.is_null() {
            None
        } else {
            Some(svc)
        }
    }

    unsafe fn ns_error_message(err: *mut AnyObject) -> String {
        if err.is_null() {
            return "unknown error".into();
        }
        let desc: *mut AnyObject = unsafe { msg_send![err, localizedDescription] };
        if desc.is_null() {
            return "no description".into();
        }
        let utf8: *const std::os::raw::c_char = unsafe { msg_send![desc, UTF8String] };
        if utf8.is_null() {
            return "no utf8 description".into();
        }
        unsafe { CStr::from_ptr(utf8) }
            .to_string_lossy()
            .into_owned()
    }

    pub fn register() -> Result<(), String> {
        unsafe {
            let svc = main_app_service().ok_or("SMAppService not available")?;
            let mut err: *mut AnyObject = std::ptr::null_mut();
            let ok: bool = msg_send![svc, registerAndReturnError: &mut err];
            if ok {
                Ok(())
            } else {
                Err(ns_error_message(err))
            }
        }
    }

    pub fn unregister() -> Result<(), String> {
        unsafe {
            let svc = main_app_service().ok_or("SMAppService not available")?;
            let mut err: *mut AnyObject = std::ptr::null_mut();
            let ok: bool = msg_send![svc, unregisterAndReturnError: &mut err];
            if ok {
                Ok(())
            } else {
                Err(ns_error_message(err))
            }
        }
    }

    pub fn status() -> Status {
        unsafe {
            let Some(svc) = main_app_service() else {
                return Status::NotFound;
            };
            let s: isize = msg_send![svc, status];
            match s {
                0 => Status::NotRegistered,
                1 => Status::Enabled,
                2 => Status::RequiresApproval,
                _ => Status::NotFound,
            }
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Diagnosis {
    pub backend: Option<String>,
    pub sm_status: Option<String>,
    pub in_app_bundle: bool,
    pub label: Option<String>,
    pub plist_path: Option<String>,
    pub plist_exists: bool,
    pub launchctl_loaded: bool,
    pub agent_target: Option<String>,
    pub running_exe: Option<String>,
}

#[cfg(target_os = "macos")]
fn label(app: &tauri::AppHandle) -> String {
    app.config().identifier.clone()
}

#[cfg(target_os = "macos")]
fn launch_agents_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_default()
        .join("Library/LaunchAgents")
}

#[cfg(target_os = "macos")]
fn plist_path(app: &tauri::AppHandle) -> PathBuf {
    launch_agents_dir().join(format!("{}.plist", label(app)))
}

#[cfg(target_os = "macos")]
pub fn diagnose(app: &tauri::AppHandle) -> Diagnosis {
    let path = plist_path(app);
    let plist_exists = path.exists();
    let lbl = label(app);
    let in_app_bundle = is_in_app_bundle();
    let uid = unsafe { libc::getuid() };
    let launchctl_loaded = Command::new("launchctl")
        .args(["print", &format!("gui/{uid}/{lbl}")])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let agent_target = plist_exists
        .then(|| {
            Command::new("/usr/libexec/PlistBuddy")
                .args(["-c", "Print :ProgramArguments:0", &path.to_string_lossy()])
                .output()
                .ok()
                .and_then(|o| {
                    o.status
                        .success()
                        .then(|| String::from_utf8_lossy(&o.stdout).trim().to_string())
                })
        })
        .flatten();

    let running_exe = std::env::current_exe()
        .ok()
        .and_then(|p| p.canonicalize().ok())
        .map(|p| p.display().to_string());

    let sm_available = sm::available();
    let sm_status = sm_available.then(|| sm::status().as_str().to_string());
    let backend = Some(
        if sm_available && in_app_bundle {
            "sm_app_service"
        } else {
            "launch_agent"
        }
        .to_string(),
    );

    Diagnosis {
        backend,
        sm_status,
        in_app_bundle,
        label: Some(lbl),
        plist_path: Some(path.display().to_string()),
        plist_exists,
        launchctl_loaded,
        agent_target,
        running_exe,
    }
}

#[cfg(not(target_os = "macos"))]
pub fn diagnose(_app: &tauri::AppHandle) -> Diagnosis {
    Diagnosis {
        backend: None,
        sm_status: None,
        in_app_bundle: false,
        label: None,
        plist_path: None,
        plist_exists: false,
        launchctl_loaded: false,
        agent_target: None,
        running_exe: std::env::current_exe()
            .ok()
            .map(|p| p.display().to_string()),
    }
}

#[cfg(target_os = "macos")]
pub fn is_enabled(app: &tauri::AppHandle) -> bool {
    if sm::available() && sm::status() == sm::Status::Enabled {
        return true;
    }
    let d = diagnose(app);
    d.plist_exists && d.launchctl_loaded
}

#[cfg(not(target_os = "macos"))]
pub fn is_enabled(_app: &tauri::AppHandle) -> bool {
    false
}

#[cfg(target_os = "macos")]
pub fn set_enabled(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let lbl = label(app);
    let path = plist_path(app);
    let uid = unsafe { libc::getuid() };
    let target = format!("gui/{uid}/{lbl}");

    if enabled {
        // Path A: SMAppService
        if sm::available() && is_in_app_bundle() {
            match sm::register() {
                Ok(()) => {
                    let _ = Command::new("launchctl")
                        .args(["bootout", &target])
                        .output();
                    if path.exists() {
                        let _ = fs::remove_file(&path);
                    }
                    return Ok(());
                }
                Err(e) => eprintln!(
                    "autostart: SMAppService.register failed: {e}; falling back to LaunchAgent"
                ),
            }
        }

        // Path B: LaunchAgent
        let dir = launch_agents_dir();
        if !dir.exists() {
            fs::create_dir_all(&dir).map_err(|e| format!("mkdir LaunchAgents: {e}"))?;
        }

        let exe = std::env::current_exe()
            .and_then(|p| p.canonicalize())
            .map_err(|e| format!("current_exe: {e}"))?;
        let exe = exe.display().to_string();

        let _ = Command::new("launchctl")
            .args(["bootout", &target])
            .output();

        let plist = format!(
            "{xml}\n{doctype}\n\
            <plist version=\"1.0\">\n  \
            <dict>\n  \
                <key>Label</key>\n  <string>{lbl}</string>\n  \
                <key>ProgramArguments</key>\n  <array>\n      <string>{exe}</string>\n  </array>\n  \
                <key>RunAtLoad</key>\n  <true/>\n  \
                <key>ProcessType</key>\n  <string>Interactive</string>\n  \
                <key>LimitLoadToSessionType</key>\n  <string>Aqua</string>\n  \
            </dict>\n</plist>",
            xml = r#"<?xml version="1.0" encoding="UTF-8"?>"#,
            doctype = r#"<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">"#,
        );

        fs::File::create(&path)
            .and_then(|mut f| f.write_all(plist.as_bytes()))
            .map_err(|e| format!("write plist: {e}"))?;

        let out = Command::new("launchctl")
            .args(["bootstrap", &format!("gui/{uid}"), &path.to_string_lossy()])
            .output()
            .map_err(|e| format!("launchctl bootstrap: {e}"))?;
        if !out.status.success() {
            let _ = Command::new("launchctl")
                .args(["kickstart", &target])
                .output();
            if !is_enabled(app) {
                return Err(format!(
                    "launchctl bootstrap failed: {}",
                    String::from_utf8_lossy(&out.stderr).trim()
                ));
            }
        }
        Ok(())
    } else {
        if sm::available() {
            let _ = sm::unregister();
        }
        let _ = Command::new("launchctl")
            .args(["bootout", &target])
            .output();
        if path.exists() {
            let _ = fs::remove_file(&path);
        }
        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
pub fn set_enabled(_app: &tauri::AppHandle, _enabled: bool) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn open_system_login_items() -> Result<(), String> {
    Command::new("open")
        .arg("x-apple.systempreferences:com.apple.LoginItems-Settings.extension")
        .output()
        .map_err(|e| format!("open System Settings: {e}"))
        .map(|_| ())
}

#[cfg(not(target_os = "macos"))]
pub fn open_system_login_items() -> Result<(), String> {
    Err("not supported".into())
}
