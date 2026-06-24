use crate::state::AppInfo;
use std::path::Path;

/// Scan /Applications, ~/Applications, /System/Applications for .app bundles.
pub fn scan_apps() -> Vec<AppInfo> {
    let mut apps = Vec::new();
    let dirs = [
        "/Applications".to_string(),
        "/System/Applications".to_string(),
        format!(
            "{}/Applications",
            dirs::home_dir().unwrap_or_default().to_string_lossy()
        ),
    ];

    for dir in &dirs {
        let path = Path::new(dir);
        if !path.is_dir() {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.extension().and_then(|s| s.to_str()) == Some("app") {
                    if let Some(info) = parse_app(&entry_path) {
                        apps.push(info);
                    }
                }
                // Scan one level deep for subdirectories (e.g. /Applications/Utilities/)
                if entry_path.is_dir() && entry_path.extension().is_none() {
                    if let Ok(sub_entries) = std::fs::read_dir(&entry_path) {
                        for sub_entry in sub_entries.flatten() {
                            let sub_path = sub_entry.path();
                            if sub_path.extension().and_then(|s| s.to_str()) == Some("app") {
                                if let Some(info) = parse_app(&sub_path) {
                                    apps.push(info);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Sort alphabetically by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.path == b.path);
    apps
}

/// Parse an .app bundle's Info.plist to extract name and bundle id.
fn parse_app(app_path: &Path) -> Option<AppInfo> {
    let plist_path = app_path.join("Contents/Info.plist");
    if !plist_path.exists() {
        // Fallback: use directory name as app name
        let name = app_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
        return Some(AppInfo {
            name: name.clone(),
            path: app_path.to_string_lossy().to_string(),
            bundle_id: String::new(),
            pinyin_initials: get_pinyin_initials(&name),
            icon_path: None,
        });
    }

    // Use /usr/libexec/PlistBuddy to read plist values (available on macOS)
    let name = read_plist_value(&plist_path, "CFBundleDisplayName")
        .or_else(|| read_plist_value(&plist_path, "CFBundleName"))
        .unwrap_or_else(|| {
            app_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown")
                .to_string()
        });

    let bundle_id =
        read_plist_value(&plist_path, "CFBundleIdentifier").unwrap_or_default();

    let icon_name =
        read_plist_value(&plist_path, "CFBundleIconFile").unwrap_or_default();
    let icon_path = if !icon_name.is_empty() {
        // Try .icns and .tiff extensions
        let icns = app_path.join("Contents/Resources").join(format!("{icon_name}.icns"));
        let tiff = app_path.join("Contents/Resources").join(format!("{icon_name}.tiff"));
        if icns.exists() {
            Some(icns.to_string_lossy().to_string())
        } else if tiff.exists() {
            Some(tiff.to_string_lossy().to_string())
        } else {
            None
        }
    } else {
        None
    };

    Some(AppInfo {
        name: name.clone(),
        path: app_path.to_string_lossy().to_string(),
        bundle_id,
        pinyin_initials: get_pinyin_initials(&name),
        icon_path,
    })
}

fn read_plist_value(plist_path: &Path, key: &str) -> Option<String> {
    std::process::Command::new("/usr/libexec/PlistBuddy")
        .args(["-c", &format!("Print :{key}"), &plist_path.to_string_lossy()])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

/// Get pinyin initials for a string. For ASCII characters, returns the
/// character itself. For CJK characters, returns the first letter of the
/// pinyin. This is a simplified implementation — a full pinyin dictionary
/// would be more accurate.
pub fn get_pinyin_initials(s: &str) -> String {
    let mut result = String::new();
    for c in s.chars() {
        if c.is_ascii() {
            if c.is_alphabetic() {
                result.push(c.to_ascii_uppercase());
            }
        } else {
            // Simplified CJK pinyin first letter mapping
            // This covers common characters; for production use a proper pinyin crate
            result.push(cjk_to_pinyin_initial(c));
        }
    }
    result
}

/// Map a CJK character to its pinyin initial. This is a simplified table
/// covering the most common Chinese characters. For a production app,
/// consider using the `pinyin` crate.
fn cjk_to_pinyin_initial(c: char) -> char {
    let code = c as u32;
    // Common CJK Unicode range
    if !(0x4E00..=0x9FFF).contains(&code) {
        return c;
    }

    // Simplified mapping by Unicode code point ranges
    // This is a rough approximation — a real pinyin library is more accurate
    match code {
        0x5FAE => 'W', // 微
        0x4FE1 => 'X', // 信
        0x8BBF => 'F', // 访
        0x8FBE => 'D', // 达
        0x7CFB => 'X', // 系
        0x7EDF => 'T', // 统
        0x504F => 'P', // 偏
        0x597D => 'H', // 好
        0x8BBE => 'S', // 设
        0x7F6E => 'Z', // 置
        0x817E => 'T', // 腾
        0x8BAF => 'X', // 讯
        0x4F1A => 'H', // 会
        0x8BAE => 'Y', // 议
        0x5FEB => 'K', // 快
        0x64AD => 'B', // 播
        0x653E => 'F', // 放
        0x5668 => 'Q', // 器
        0x97F3 => 'Y', // 音
        0x4E50 => 'L', // 乐
        0x5BFC => 'D', // 导
        0x822A => 'H', // 航
        0x56FE => 'T', // 图
        0x7247 => 'P', // 片
        0x9605 => 'Y', // 阅
        0x8BFB => 'D', // 读
        0x6587 => 'W', // 文
        0x6863 => 'D', // 档
        0x5907 => 'B', // 备
        0x5FD8 => 'W', // 忘
        0x5F55 => 'L', // 录
        0x65E5 => 'R', // 日
        0x5386 => 'L', // 历
        0x8BA1 => 'J', // 计
        0x7B97 => 'S', // 算
        0x673A => 'J', // 机
        0x7F51 => 'W', // 网
        0x7EDC => 'L', // 络
        0x5E94 => 'Y', // 应
        0x7528 => 'Y', // 用
        0x5546 => 'S', // 商
        0x5E97 => 'D', // 店
        0x90AE => 'Y', // 邮
        0x4EF6 => 'J', // 件
        0x5730 => 'D', // 地
        0x5740 => 'Z', // 址
        0x8054 => 'L', // 联
        0x4EBA => 'R', // 人
        0x6D88 => 'X', // 消
        0x606F => 'X', // 息
        0x8F93 => 'S', // 输
        0x5165 => 'R', // 入
        0x6CD5 => 'F', // 法
        0x4E0B => 'X', // 下
        0x8F7D => 'Z', // 载
        0x684C => 'Z', // 桌
        0x9762 => 'M', // 面
        0x6D4F => 'L', // 浏
        0x89C8 => 'L', // 览
        0x641C => 'S', // 搜
        0x7D22 => 'S', // 索
        0x5F00 => 'K', // 开
        0x53D1 => 'F', // 发
        0x5DE5 => 'G', // 工
        0x5177 => 'J', // 具
        0x7EC8 => 'Z', // 终
        0x7AEF => 'D', // 端
        0x7F16 => 'B', // 编
        0x8F91 => 'J', // 辑
        0x4E66 => 'S', // 书
        0x7B7E => 'Q', // 签
        0x6536 => 'S', // 收
        0x85CF => 'C', // 藏
        0x526A => 'J', // 剪
        0x5207 => 'Q', // 切
        0x622A => 'J', // 截
        0x5C4F => 'P', // 屏
        0x5236 => 'Z', // 制
        0x6539 => 'G', // 改
        // Default: return the character itself for unmapped CJK
        _ => c,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pinyin_initials_ascii() {
        assert_eq!(get_pinyin_initials("Safari"), "SAFARI");
        assert_eq!(get_pinyin_initials("Xcode"), "XCODE");
    }

    #[test]
    fn pinyin_initials_chinese() {
        assert_eq!(get_pinyin_initials("微信"), "WX");
        assert_eq!(get_pinyin_initials("访达"), "FD");
    }
}
