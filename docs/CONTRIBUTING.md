# Contributing to Quick Launch

## 开发环境搭建

1. **安装依赖**
   ```bash
   # Node.js 22+ 和 pnpm 10+
   pnpm install

   # Rust 工具链
   rustup install stable
   ```

2. **开发运行**
   ```bash
   pnpm tauri dev
   ```

3. **构建**
   ```bash
   pnpm tauri build
   ```

## 代码规范

### Rust
- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量
- 所有 `#[tauri::command]` 函数需要错误处理 (`Result<T, String>`)
- macOS 特定代码需要 `#[cfg(target_os = "macos")]` 守卫
- 文件操作使用 `app.path().app_data_dir()` 而非硬编码路径

### TypeScript
- 使用 `tsc --noEmit` 进行类型检查
- 所有 Tauri 命令调用通过 `bridge.ts` 统一管理
- 类型定义完整，避免使用 `any`
- 事件监听器在 `useEffect` 返回中清理

## 提交规范

使用 [Conventional Commits](https://conventionalcommits.org/)：

```
feat: 添加录屏功能
fix: 修复面板定位偏移
refactor: 重构按键绑定存储
docs: 更新 README
test: 添加拼音匹配测试
chore: 升级 Tauri 依赖
```

## PR 流程

1. 从 `develop` 分支创建 feature 分支
2. 提交代码并确保通过 CI
3. 创建 PR 到 `develop` 分支
4. 通过 Code Review 后合并
5. 定期将 `develop` 合并到 `main` 发布 Release

## 测试

```bash
# 前端测试
pnpm test

# Rust 测试
cd src-tauri && cargo test --workspace
```
