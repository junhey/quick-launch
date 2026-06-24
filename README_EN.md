# Quick Launch

> Mac Launcher · Press Control to summon the panel, bind anything to a key

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131)](https://tauri.app)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
[![CI](https://github.com/junhey/quick-launch/actions/workflows/ci.yml/badge.svg)](https://github.com/junhey/quick-launch/actions/workflows/ci.yml)

[中文](README.md) | English

An open-source macOS launcher. Press `Control+Space` to summon the panel, bind apps, folders, URLs, and built-in actions to 38 keys. Once you're familiar with the layout, `Control+Space` → key triggers anything in under a second.

## Features

- **Control+Space panel** — Global hotkey to toggle the launcher
- **38-key layout** — Bind apps / folders / URLs / built-in actions to convenient keys
- **Space to search** — Match by first letter / pinyin initials / name, launch with Return or number keys
- **Built-in actions** — Lock screen, show desktop, toggle theme
- **Light / Dark theme** — Quick toggle with Tab, supports system auto
- **Menu bar resident** — System tray icon, auto-hide on focus loss
- **Launch at login** — SMAppService + LaunchAgent dual backend
- **Config import/export** — JSON format for easy migration and sharing
- **Lightweight** — Tauri 2.0 (Rust + React), ~8MB binary, ~40MB RAM

## Download

After pushing a version tag (e.g. `v0.1.0`), GitHub Actions automatically builds and publishes the `.dmg` to the [Releases](https://github.com/junhey/quick-launch/releases) page. Download and drag to Applications.

> First launch requires granting Accessibility permission in System Settings. Unsigned builds require right-click → Open to bypass Gatekeeper.

## Usage

| Action | Shortcut |
|--------|----------|
| Toggle panel | `Control+Space` |
| Search apps | `Space` (in panel) |
| Launch result | `Return` or `1-0` |
| Toggle theme | `Tab` |
| Open settings | `,` |
| Dismiss panel | `Esc` or click outside |

### Key Bindings

1. Summon the panel, click any empty key to enter binding editor
2. Choose binding type: App / Folder / URL / Action
3. Enter path or URL, confirm
4. Press the key anytime to trigger

## Development

```bash
# Install dependencies
pnpm install

# Development mode
pnpm tauri dev

# Production build
pnpm tauri build

# Run tests
pnpm test          # Frontend tests
cd src-tauri && cargo test  # Rust tests
```

### Prerequisites

- Node.js 22+
- Rust (stable)
- Xcode Command Line Tools
- pnpm 10+

## Project Layout

```
quick-launch/
├── src/                    # React frontend
│   ├── App.tsx             # Main panel + settings
│   ├── bridge.ts           # JS <-> Rust IPC bridge
│   ├── store.ts            # Zustand state management
│   ├── types.ts            # TypeScript types
│   ├── constants.ts        # 38-key layout constants
│   └── styles.css          # Glass effect + themes
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Tauri app init
│   │   ├── commands.rs     # IPC command interface
│   │   ├── state.rs        # Global state
│   │   ├── storage.rs      # JSON persistence
│   │   ├── hotkey.rs       # Global shortcut parsing
│   │   ├── tray.rs         # System tray + focus hide
│   │   ├── autostart.rs    # macOS launch at login
│   │   ├── app_index.rs    # App index scanner
│   │   ├── app_launcher.rs # App launcher
│   │   └── key_bindings.rs # Key binding manager
│   └── tauri.conf.json     # Tauri config
└── .github/workflows/      # CI/CD
```

## Acknowledgments

- [Tauri](https://tauri.app) — Cross-platform desktop framework
- [Raycast](https://raycast.com) / [Alfred](https://alfredapp.com) — Launcher design reference

## License

MIT (c) 2026 junhey
