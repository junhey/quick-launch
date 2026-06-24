import { useEffect, useCallback, useRef, useState } from "react";
import { useStore } from "./store";
import { bridge } from "./bridge";
import { open } from "@tauri-apps/plugin-dialog";
import { KEY_LAYOUT, BUILTIN_ACTIONS } from "./constants";
import type { AppInfo, Binding, Config } from "./types";

// ── Main App ──
export default function App() {
  const {
    panelVisible, view, searchMode, searchQuery, searchResults,
    selectedIndex, keyBindings, config, editingKey,
    setPanelVisible, setView, setSearchMode, setSearchQuery,
    setSearchResults, setSelectedIndex, setKeyBindings, setConfig,
    setEditingKey, resetSearch,
  } = useStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const unlisten = bridge.onPopupToggle(() => {
      setPanelVisible(!useStore.getState().panelVisible);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [setPanelVisible]);

  useEffect(() => {
    bridge.getConfig().then(setConfig).catch(console.error);
    bridge.getKeyBindings().then((kb) => setKeyBindings(kb.bindings)).catch(console.error);
  }, [setConfig, setKeyBindings]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(() => {
      bridge.searchApps(query).then(setSearchResults).catch(console.error);
    }, 120);
  }, [setSearchQuery, setSearchResults]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingKey && e.key === "Escape") {
      setEditingKey(null);
      return;
    }

    if (e.key === "Escape") {
      searchMode ? resetSearch() : bridge.hidePopup();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const next = useStore.getState().theme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      useStore.getState().setTheme(next);
      return;
    }
    if (e.key === " " && !searchMode && view === "launcher") {
      e.preventDefault();
      setSearchMode(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return;
    }
    if (searchMode) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(Math.min(selectedIndex + 1, searchResults.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(Math.max(selectedIndex - 1, 0)); }
      else if (e.key === "Return") {
        e.preventDefault();
        const app = searchResults[selectedIndex];
        if (app) bridge.launchApp(app.path).then(() => bridge.hidePopup()).catch(console.error);
      }
      else if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === "0" ? 9 : parseInt(e.key) - 1;
        if (searchResults[idx]) bridge.launchApp(searchResults[idx].path).then(() => bridge.hidePopup()).catch(console.error);
      }
      return;
    }
    if (view === "launcher" && !searchMode) {
      const uk = e.key.toUpperCase();
      if (KEY_LAYOUT.flat().includes(uk)) {
        const b = keyBindings[uk];
        if (b) { e.preventDefault(); bridge.executeBinding(uk).then(() => bridge.hidePopup()).catch(console.error); }
      }
      if (e.key === ",") { e.preventDefault(); setView("settings"); }
    }
    if (view === "settings" && e.key === "Escape") setView("launcher");
  }, [searchMode, selectedIndex, searchResults, keyBindings, view, editingKey,
      setSearchMode, setSelectedIndex, resetSearch, setView, setEditingKey]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!panelVisible) return null;

  return (
    <div className="app" data-theme={useStore.getState().theme}>
      <HeaderBadge view={view} searchMode={searchMode} onSettings={() => setView("settings")} />
      {view === "launcher" ? (
        <LauncherView
          searchMode={searchMode} searchQuery={searchQuery} searchResults={searchResults}
          selectedIndex={selectedIndex} editingKey={editingKey} keyBindings={keyBindings}
          onSearch={handleSearch} searchInputRef={searchInputRef}
          onKeyTrigger={handleKeyTrigger}
          onRemoveBinding={handleRemoveBinding}
        />
      ) : (
        <SettingsView config={config} onBack={() => setView("launcher")}
          onExport={handleExport} onImport={handleImport} />
      )}
      <FooterBadge />
    </div>
  );

  function handleKeyTrigger(key: string) {
    const b = keyBindings[key];
    if (b) bridge.executeBinding(key).then(() => bridge.hidePopup()).catch(console.error);
    else setEditingKey(key);
  }

  function handleRemoveBinding(key: string) {
    bridge.removeKeyBinding(key).then(() => {
      const n = { ...keyBindings }; delete n[key];
      setKeyBindings(n);
      setEditingKey(null);
    }).catch(console.error);
  }

  function handleExport() {
    bridge.exportConfig().then((j) => {
      const b = new Blob([j], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = "quick-launch-config.json"; a.click();
      URL.revokeObjectURL(a.href);
    }).catch(console.error);
  }

  function handleImport() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => bridge.importConfig(r.result as string)
        .then(() => { bridge.getKeyBindings().then((kb) => setKeyBindings(kb.bindings)); bridge.getConfig().then(setConfig); })
        .catch(console.error);
      r.readAsText(f);
    };
    inp.click();
  }
}

// ── Header Badge ──
function HeaderBadge({ view, searchMode, onSettings }: { view: string; searchMode: boolean; onSettings: () => void }) {
  return (
    <div className="header-badge">
      <span className="brand">
        <span className="brand-icon">⚡</span>
        <span className="brand-text">Quick Launch</span>
      </span>
      <span className="hints">
        {searchMode ? "↑↓ 导航 · ↩ 启动 · Esc 返回" : `Space 搜索 · , 设置`}
      </span>
      {/* Version badge shows only in launcher view */}
      {view === "launcher" && <span className="version-badge">v0.1</span>}
    </div>
  );
}

// ── Footer Badge ──
function FooterBadge() {
  return (
    <div className="footer-badge">
      <span>38 Keys</span>
      <span>·</span>
      <span>MIT</span>
    </div>
  );
}

// ── Launcher View ──
function LauncherView(p: {
  searchMode: boolean; searchQuery: string; searchResults: AppInfo[];
  selectedIndex: number; editingKey: string | null; keyBindings: Record<string, Binding>;
  onSearch: (q: string) => void; searchInputRef: React.RefObject<HTMLInputElement | null>;
  onKeyTrigger: (k: string) => void; onRemoveBinding: (k: string) => void;
}) {
  if (p.searchMode) return <SearchView {...p} />;
  return <KeyGridView {...p} />;
}

function SearchView(p: LauncherViewProps) {
  return (
    <div className="launcher">
      <div className="search-wrap">
        <div className="search-icon">🔍</div>
        <input ref={p.searchInputRef as React.RefObject<HTMLInputElement>}
          className="search-input" autoFocus
          placeholder="搜索应用 (名称 / 拼音 / 首字母)..."
          value={p.searchQuery} onChange={(e) => p.onSearch(e.target.value)} />
      </div>
      <div className="search-list">
        {p.searchResults.map((app, i) => (
          <div key={app.path}
            className={`search-row ${i === p.selectedIndex ? "active" : ""}`}
            onClick={() => bridge.launchApp(app.path).then(() => bridge.hidePopup())}>
            <span className="sr-num">{i < 9 ? i + 1 : 0}</span>
            <span className="sr-icon">📦</span>
            <span className="sr-name">{app.name}</span>
            <span className="sr-path">{app.path.replace("/Applications/", "…/")}</span>
          </div>
        ))}
        {p.searchResults.length === 0 && p.searchQuery && (
          <div className="no-results">没有匹配的应用</div>
        )}
      </div>
    </div>
  );
}

type LauncherViewProps = typeof LauncherView extends (p: infer P) => any ? P : never;

function KeyGridView(p: LauncherViewProps) {
  return (
    <div className="launcher">
      <div className="key-grid">
        {KEY_LAYOUT.map((row, ri) => (
          <div key={ri} className="key-row">
            {row.map((key) => (
              <KeyCell key={key} keyChar={key}
                binding={p.keyBindings[key]}
                isEditing={p.editingKey === key}
                onTrigger={() => p.onKeyTrigger(key)}
                onRemove={() => p.onRemoveBinding(key)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Key Cell ──
function KeyCell(p: { keyChar: string; binding?: Binding; isEditing: boolean;
  onTrigger: () => void; onRemove: () => void }) {
  const [bindStep, setBindStep] = useState<"type" | "form" | null>(null);
  const [bindType, setBindType] = useState<string>("");
  const [bindValue, setBindValue] = useState("");
  const [bindName, setBindName] = useState("");
  const s = useStore;

  // Reset on close
  useEffect(() => { if (!p.isEditing) { setBindStep(null); setBindType(""); setBindValue(""); setBindName(""); } }, [p.isEditing]);

  if (p.isEditing) {
    return (
      <div className="key-cell editing">
        <div className="key-char">{p.keyChar}</div>
        <div className="bind-popup">
          {!bindStep ? (
            <div className="bind-type-btns">
              <button className="btb" onClick={() => { setBindType("app"); setBindStep("form"); }}>📦 应用</button>
              <button className="btb" onClick={() => { setBindType("folder"); setBindStep("form"); }}>📁 文件夹</button>
              <button className="btb" onClick={() => { setBindType("url"); setBindStep("form"); }}>🌐 网页</button>
              <button className="btb" onClick={() => { setBindStep(null); showActionPicker(); }}>⚡ 操作</button>
              {p.binding && <button className="btb danger" onClick={p.onRemove}>删除绑定</button>}
              <button className="btb dim" onClick={() => s().setEditingKey(null)}>取消</button>
            </div>
          ) : (
            <div className="bind-detail">
              <button className="back-btn" onClick={() => setBindStep(null)}>← 返回</button>
              {bindType === "app" || bindType === "folder" ? (
                <BindFileForm type={bindType as "app"|"folder"} onDone={() => s().setEditingKey(null)} />
              ) : (
                <BindUrlForm onDone={() => s().setEditingKey(null)} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const icon = p.binding
    ? p.binding.type === "action" ? BUILTIN_ACTIONS.find(a => a.id === (p.binding as any).action)?.icon
      : p.binding.type === "app" ? "📦" : p.binding.type === "folder" ? "📁" : "🌐"
    : null;

  return (
    <div className={`key-cell ${p.binding ? "bound" : ""}`}
      onClick={p.onTrigger} onContextMenu={(e) => { e.preventDefault(); s().setEditingKey(p.keyChar); }}>
      <div className="key-char">{p.keyChar}</div>
      {p.binding && (
        <div className="binding-info">
          <span className="bi-icon">{icon}</span>
          <span className="bi-name">{p.binding.name}</span>
        </div>
      )}
    </div>
  );

  function showActionPicker() {
    const ac = BUILTIN_ACTIONS;
    const doBind = (id: string, name: string) => {
      bridge.setKeyBinding(p.keyChar, { type: "action", action: id, name } as any).then(() => {
        bridge.getKeyBindings().then(kb => s().setKeyBindings(kb.bindings));
      });
    };
    // Return to type selection; actions are shown inline in bind-type-btns already
  }
}

// ── Bind File Form (native picker) ──
function BindFileForm({ type, onDone }: { type: "app" | "folder"; onDone: () => void }) {
  const s = useStore;
  const ek = s().editingKey!;
  const [picked, setPicked] = useState(false);

  const pick = async () => {
    const opts: any = { title: type === "app" ? "选择应用" : "选择文件夹", multiple: false };
    if (type === "app") opts.filters = [{ name: "应用程序", extensions: ["app"] }];
    else opts.directory = true;
    const result = await open(opts);
    if (result) {
      const path = result as string;
      const name = path.split("/").pop()?.replace(/\.app$/i, "") || path;
      const b: Binding = type === "app"
        ? { type: "app", path, name }
        : { type: "folder", path, name };
      await bridge.setKeyBinding(ek, b);
      bridge.getKeyBindings().then(kb => s().setKeyBindings(kb.bindings));
      setPicked(true);
      setTimeout(onDone, 300);
    }
  };

  return (
    <div className="bind-file-form">
      <p className="bf-hint">使用原生文件选择器选择{type === "app" ? "应用程序" : "文件夹"}</p>
      <button className="pick-btn" onClick={pick} disabled={picked}>
        {picked ? "✅ 已设置" : `选择${type === "app" ? "App" : "文件夹"}...`}
      </button>
    </div>
  );
}

// ── Bind URL Form ──
function BindUrlForm({ onDone }: { onDone: () => void }) {
  const s = useStore;
  const ek = s().editingKey!;
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const submit = async () => {
    if (!url.trim()) return;
    const b: Binding = { type: "url", url: url.trim(), name: name.trim() || url.trim() };
    await bridge.setKeyBinding(ek, b);
    bridge.getKeyBindings().then(kb => s().setKeyBindings(kb.bindings));
    onDone();
  };

  return (
    <div className="bind-url-form">
      <input placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} autoFocus
        onKeyDown={e => e.key === "Enter" && submit()} />
      <input placeholder="显示名称 (可选)" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()} />
      <button className="pick-btn" onClick={submit}>确认</button>
    </div>
  );
}

// ── Settings View ──
function SettingsView(p: { config: Config | null; onBack: () => void; onExport: () => void; onImport: () => void }) {
  const { theme, setTheme } = useStore();
  const [autostart, setAutostart] = useState(false);
  const [dockVisible, setDockVisible] = useState(true);
  const [menuBarVisible, setMenuBarVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    bridge.autostartGet().then(setAutostart).catch(console.error);
  }, []);

  const refreshApps = async () => {
    setRefreshing(true);
    const count = await bridge.refreshAppIndex();
    setRefreshing(false);
    alert(`已刷新应用索引，共 ${count} 个应用`);
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <button onClick={p.onBack} className="btn-back">←</button>
        <h2>设置</h2>
      </div>
      <div className="settings-body">
        <div className="setting-group">
          <div className="sg-title">外观</div>
          <div className="setting-row">
            <label>主题</label>
            <select value={theme} onChange={e => {
              setTheme(e.target.value as any);
              document.documentElement.setAttribute("data-theme", e.target.value);
            }}>
              <option value="auto">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        </div>

        <div className="setting-group">
          <div className="sg-title">系统</div>
          <div className="setting-row">
            <label>开机启动</label>
            <input type="checkbox" checked={autostart} onChange={e => {
              bridge.autostartSet(e.target.checked).then(() => setAutostart(e.target.checked)).catch(console.error);
            }} />
          </div>
          <div className="setting-row">
            <label>程序坞图标</label>
            <span className="value">{dockVisible ? "显示" : "隐藏"} (需重启生效)</span>
          </div>
          <div className="setting-row">
            <label>菜单栏图标</label>
            <span className="value">{menuBarVisible ? "已显示" : "已隐藏"}</span>
          </div>
          <div className="setting-row">
            <label>全局快捷键</label>
            <span className="value monospace">{p.config?.hotkey || "Control+Space"}</span>
          </div>
        </div>

        <div className="setting-group">
          <div className="sg-title">数据管理</div>
          <div className="setting-row">
            <label>应用索引</label>
            <button className="btn-sm" onClick={refreshApps} disabled={refreshing}>
              {refreshing ? "刷新中..." : "手动刷新"}
            </button>
          </div>
          <div className="setting-row">
            <label>配置</label>
            <div className="btn-row">
              <button className="btn-sm" onClick={p.onExport}>导出</button>
              <button className="btn-sm" onClick={p.onImport}>导入</button>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <span>Quick Launch v0.1.0 · MIT · junhey</span>
        </div>
      </div>
    </div>
  );
}
