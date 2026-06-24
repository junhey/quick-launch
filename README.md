# Quick Launch

> Mac 启动器 · Control 呼出面板，按键直达

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131)](https://tauri.app)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
[![CI](https://github.com/junhey/quick-launch/actions/workflows/ci.yml/badge.svg)](https://github.com/junhey/quick-launch/actions/workflows/ci.yml)

一个开源的 macOS 启动器，灵感来自 [浮光 FuGuang](https://fg.vkr.me/mac)。按下 `Control+Space` 呼出面板，将 App、文件夹、网页和内置操作绑定到 38 个按键上，熟悉后直接 `Control+Space` → 对应键，一秒触发。

## 特性

- **Control+Space 呼出面板** — 全局快捷键，随时呼出/隐藏
- **38 键布局** — 绑定 App / 文件夹 / 网页 / 内置操作到顺手按键
- **Space 搜索** — 首字母 / 拼音 / 中文名匹配，Return 或数字键直达
- **内置操作** — 锁屏、回桌、切换主题
- **浅色 / 深色主题** — Tab 键快速切换，支持跟随系统
- **菜单栏常驻** — 系统托盘图标，失焦自动隐藏
- **开机启动** — macOS 登录项，SMAppService + LaunchAgent 双后端
- **配置导入导出** — JSON 格式，方便迁移和分享
- **轻量** — Tauri 2.0 (Rust + React)，~8MB 体积，~40MB 内存

## 下载安装

前往 [Releases](https://github.com/junhey/quick-launch/releases) 页面下载 `.dmg` 文件，拖入 Applications 即可使用。

> 首次启动需在系统设置中授予辅助功能权限。

## 使用方法

| 操作 | 快捷键 |
|------|--------|
| 呼出/隐藏面板 | `Control+Space` |
| 搜索应用 | `Space`（面板内） |
| 启动搜索结果 | `Return` 或 `1-0` |
| 切换主题 | `Tab` |
| 打开设置 | `,` |
| 退出面板 | `Esc` 或点击外部 |

### 按键绑定

1. 呼出面板后，点击任意空键进入绑定编辑
2. 选择绑定类型：App / 文件夹 / 网页 / 操作
3. 输入路径或 URL，确认绑定
4. 之后按对应键即可快速触发

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm tauri dev

# 构建生产版本
pnpm tauri build

# 运行测试
pnpm test          # 前端测试
cd src-tauri && cargo test  # Rust 测试
```

### 环境要求

- Node.js 22+
- Rust (stable)
- Xcode Command Line Tools
- pnpm 10+

## 项目布局

```
quick-launch/
├── src/                    # React 前端
│   ├── App.tsx             # 主面板 + 设置面板
│   ├── bridge.ts           # JS <-> Rust IPC 桥接
│   ├── store.ts            # Zustand 状态管理
│   ├── types.ts            # TypeScript 类型
│   ├── constants.ts        # 38 键布局常量
│   └── styles.css          # 毛玻璃效果 + 深浅色主题
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── lib.rs          # Tauri 应用初始化
│   │   ├── commands.rs     # IPC 命令接口
│   │   ├── state.rs        # 全局状态
│   │   ├── storage.rs      # JSON 数据持久化
│   │   ├── hotkey.rs       # 全局快捷键解析
│   │   ├── tray.rs         # 系统托盘 + 失焦隐藏
│   │   ├── autostart.rs    # macOS 开机启动
│   │   ├── app_index.rs    # 应用索引扫描
│   │   ├── app_launcher.rs # 应用启动器
│   │   └── key_bindings.rs # 按键绑定管理
│   └── tauri.conf.json     # Tauri 配置
└── .github/workflows/      # CI/CD
```

## 鸣谢

- [浮光 FuGuang](https://fg.vkr.me/mac) — Control 呼出 + 按键直达交互范式灵感
- [Tauri](https://tauri.app) — 跨平台桌面应用框架
- [Raycast](https://raycast.com) / [Alfred](https://alfredapp.com) — 启动器产品设计参考

## 许可

MIT (c) 2026 junhey
