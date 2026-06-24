import { useEffect, useCallback, useRef, useState } from "react";
import { useStore } from "./store";
import { bridge } from "./bridge";
import { KEY_LAYOUT, BUILTIN_ACTIONS } from "./constants";
import type { AppInfo, Binding, Config } from "./types";

export default function App() {
  const {
    panelVisible, view, searchMode, searchQuery, searchResults,
    selectedIndex, keyBindings, config, editingKey,
    setPanelVisible, setView, setSearchMode, setSearchQuery,
    setSearchResults, setSelectedIndex, setKeyBindings, setConfig,
    setEditingKey, resetSearch,
  } = useStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for popup toggle from Rust
  useEffect(() => {
    const unlisten = bridge.onPopupToggle(() => {
      setPanelVisible(!useStore.getState().panelVisible);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [setPanelVisible]);

  // Load config and key bindings on mount
  useEffect(() => {
    bridge.getConfig().then(setConfig).catch(console.error);
    bridge.getKeyBindings().then((kb) => setKeyBindings(kb.bindings)).catch(console.error);
  }, [setConfig, setKeyBindings]);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      bridge.searchApps(query).then(setSearchResults).catch(console.error);
    }, 150);
  }, [setSearchQuery, setSearchResults]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Esc: hide panel or exit search
    if (e.key === "Escape") {
      if (searchMode) {
        resetSearch();
      } else {
        bridge.hidePopup();
      }
      return;
    }

    // Tab: toggle theme
    if (e.key === "Tab") {
      e.preventDefault();
      const current = useStore.getState().theme;
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      useStore.getState().setTheme(next);
      return;
    }

    // Space: enter search mode
    if (e.key === " " && !searchMode && view === "launcher") {
      e.preventDefault();
      setSearchMode(true);
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return;
    }

    // In search mode: navigate results
    if (searchMode) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
      } else if (e.key === "Return") {
        e.preventDefault();
        const app = searchResults[selectedIndex];
        if (app) {
          bridge.launchApp(app.path).then(() => bridge.hidePopup()).catch(console.error);
        }
      } else if (/^[0-9]$/.test(e.key)) {
        const idx = e.key === "0" ? 9 : parseInt(e.key) - 1;
        const app = searchResults[idx];
        if (app) {
          bridge.launchApp(app.path).then(() => bridge.hidePopup()).catch(console.error);
        }
      }
      return;
    }

    // Launcher mode: check key bindings
    if (view === "launcher" && !searchMode) {
      const upperKey = e.key.toUpperCase();
      if (KEY_LAYOUT.flat().includes(upperKey)) {
        const binding = keyBindings[upperKey];
        if (binding) {
          e.preventDefault();
          bridge.executeBinding(upperKey).then(() => bridge.hidePopup()).catch(console.error);
        }
      }
      // Open settings with comma
      if (e.key === ",") {
        e.preventDefault();
        setView("settings");
      }
    }

    // Settings: Esc to go back
    if (view === "settings" && e.key === "Escape") {
      setView("launcher");
    }
  }, [searchMode, selectedIndex, searchResults, keyBindings, view, setSearchMode, setSelectedIndex, resetSearch, setView]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!panelVisible) return null;

  return (
    <div className="app" data-theme={useStore.getState().theme}>
      {view === "launcher" ? (
        <LauncherView
          searchMode={searchMode}
          searchQuery={searchQuery}
          searchResults={searchResults}
          selectedIndex={selectedIndex}
          editingKey={editingKey}
          keyBindings={keyBindings}
          onSearch={handleSearch}
          searchInputRef={searchInputRef}
          onKeyClick={handleKeyClick}
          onKeyRightClick={handleKeyRightClick}
          onRemoveBinding={handleRemoveBinding}
        />
      ) : (
        <SettingsView
          config={config}
          onBack={() => setView("launcher")}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
    </div>
  );

  function handleKeyClick(key: string) {
    const binding = keyBindings[key];
    if (binding) {
      bridge.executeBinding(key).then(() => bridge.hidePopup()).catch(console.error);
    } else {
      setEditingKey(key);
    }
  }

  function handleKeyRightClick(e: React.MouseEvent, key: string) {
    e.preventDefault();
    setEditingKey(editingKey === key ? null : key);
  }

  function handleRemoveBinding(key: string) {
    bridge.removeKeyBinding(key).then(() => {
      const next = { ...keyBindings };
      delete next[key];
      setKeyBindings(next);
    }).catch(console.error);
  }

  function handleExport() {
    bridge.exportConfig().then((json) => {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quick-launch-config.json";
      a.click();
      URL.revokeObjectURL(url);
    }).catch(console.error);
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        bridge.importConfig(reader.result as string)
          .then(() => {
            bridge.getKeyBindings().then((kb) => setKeyBindings(kb.bindings));
            bridge.getConfig().then(setConfig);
          })
          .catch(console.error);
      };
      reader.readAsText(file);
    };
    input.click();
  }
}

// ── Launcher View ──
function LauncherView({
  searchMode, searchQuery, searchResults, selectedIndex, editingKey, keyBindings,
  onSearch, searchInputRef, onKeyClick, onKeyRightClick, onRemoveBinding,
}: {
  searchMode: boolean;
  searchQuery: string;
  searchResults: AppInfo[];
  selectedIndex: number;
  editingKey: string | null;
  keyBindings: Record<string, Binding>;
  onSearch: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onKeyClick: (key: string) => void;
  onKeyRightClick: (e: React.MouseEvent, key: string) => void;
  onRemoveBinding: (key: string) => void;
}) {
  return (
    <div className="launcher">
      {searchMode ? (
        <div className="search-container">
          <input
            ref={searchInputRef as React.RefObject<HTMLInputElement>}
            className="search-input"
            placeholder="搜索应用 (首字母 / 拼音 / 名称)..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            autoFocus
          />
          <div className="search-results">
            {searchResults.map((app, i) => (
              <div
                key={app.path}
                className={`search-item ${i === selectedIndex ? "selected" : ""} ${i < 9 ? "has-number" : ""}`}
                onClick={() => bridge.launchApp(app.path).then(() => bridge.hidePopup())}
              >
                <span className="item-number">{i < 9 ? i + 1 : 0}</span>
                <span className="item-name">{app.name}</span>
                <span className="item-path">{app.path.replace("/Applications/", "")}</span>
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && (
              <div className="no-results">无搜索结果</div>
            )}
          </div>
        </div>
      ) : (
        <div className="key-grid-container">
          <div className="grid-header">
            <span className="hint">⌨️ 按键启动 · Space 搜索 · , 设置</span>
          </div>
          <div className="key-grid">
            {KEY_LAYOUT.map((row, rowIdx) => (
              <div key={rowIdx} className="key-row">
                {row.map((key) => {
                  const binding = keyBindings[key];
                  return (
                    <KeyCell
                      key={key}
                      keyChar={key}
                      binding={binding}
                      isEditing={editingKey === key}
                      onClick={() => onKeyClick(key)}
                      onRightClick={(e) => onKeyRightClick(e, key)}
                      onRemove={() => onRemoveBinding(key)}
                      onBind={(b) => {
                        bridge.setKeyBinding(key, b).then(() => {
                          bridge.getKeyBindings().then((kb) =>
                            useStore.getState().setKeyBindings(kb.bindings)
                          );
                        });
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Key Cell ──
function KeyCell({
  keyChar, binding, isEditing, onClick, onRightClick, onRemove, onBind,
}: {
  keyChar: string;
  binding?: Binding;
  isEditing: boolean;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onBind: (b: Binding) => void;
}) {
  const [bindType, setBindType] = useState<string | null>(null);

  if (isEditing) {
    return (
      <div className="key-cell editing">
        <div className="key-char">{keyChar}</div>
        <div className="bind-options">
          {!bindType ? (
            <>
              <button onClick={() => setBindType("app")}>App</button>
              <button onClick={() => setBindType("folder")}>文件夹</button>
              <button onClick={() => setBindType("url")}>网页</button>
              <button onClick={() => setBindType("action")}>操作</button>
            </>
          ) : bindType === "action" ? (
            <div className="action-list">
              {BUILTIN_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onBind({ type: "action", action: a.id, name: a.name });
                    useStore.getState().setEditingKey(null);
                  }}
                >
                  {a.icon} {a.name}
                </button>
              ))}
            </div>
          ) : (
            <BindForm
              type={bindType as "app" | "folder" | "url"}
              onBind={(b) => {
                onBind(b);
                useStore.getState().setEditingKey(null);
              }}
              onCancel={() => setBindType(null)}
            />
          )}
          {binding && !bindType && (
            <button className="remove-btn" onClick={onRemove}>删除绑定</button>
          )}
          <button className="cancel-btn" onClick={() => useStore.getState().setEditingKey(null)}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`key-cell ${binding ? "bound" : ""}`}
      onClick={onClick}
      onContextMenu={onRightClick}
    >
      <div className="key-char">{keyChar}</div>
      {binding && (
        <div className="binding-info">
          {binding.type === "action"
            ? BUILTIN_ACTIONS.find((a) => a.id === (binding as any).action)?.icon || "⚡"
            : binding.type === "app" ? "📦"
            : binding.type === "folder" ? "📁"
            : binding.type === "url" ? "🌐"
            : "⚡"}
          <span className="binding-name">
            {binding.name}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Bind Form ──
function BindForm({
  type, onBind, onCancel,
}: {
  type: "app" | "folder" | "url";
  onBind: (b: Binding) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (!value.trim()) return;
    if (type === "app") {
      onBind({ type: "app", path: value, name: name || value.split("/").pop()?.replace(".app", "") || "App" });
    } else if (type === "folder") {
      onBind({ type: "folder", path: value, name: name || value.split("/").pop() || "文件夹" });
    } else {
      onBind({ type: "url", url: value, name: name || value });
    }
  };

  return (
    <div className="bind-form">
      <input
        placeholder={type === "app" ? "/Applications/Safari.app" : type === "folder" ? "~/Downloads" : "https://github.com"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <input
        placeholder="显示名称 (可选)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleSubmit}>确认</button>
      <button onClick={onCancel}>返回</button>
    </div>
  );
}

// ── Settings View ──
function SettingsView({
  config, onBack, onExport, onImport,
}: {
  config: Config | null;
  onBack: () => void;
  onExport: () => void;
  onImport: () => void;
}) {
  const { theme, setTheme } = useStore();
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    bridge.autostartGet().then(setAutostart).catch(console.error);
  }, []);

  return (
    <div className="settings">
      <div className="settings-header">
        <button onClick={onBack}>← 返回</button>
        <h2>设置</h2>
      </div>
      <div className="settings-body">
        <div className="setting-row">
          <label>主题</label>
          <select
            value={theme}
            onChange={(e) => {
              setTheme(e.target.value as any);
              document.documentElement.setAttribute("data-theme", e.target.value);
            }}
          >
            <option value="auto">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
        <div className="setting-row">
          <label>开机启动</label>
          <input
            type="checkbox"
            checked={autostart}
            onChange={(e) => {
              bridge.autostartSet(e.target.checked)
                .then(() => setAutostart(e.target.checked))
                .catch(console.error);
            }}
          />
        </div>
        <div className="setting-row">
          <label>快捷键</label>
          <span className="value">{config?.hotkey || "Control+Space"}</span>
        </div>
        <div className="setting-row">
          <label>配置管理</label>
          <div className="config-buttons">
            <button onClick={onExport}>导出配置</button>
            <button onClick={onImport}>导入配置</button>
          </div>
        </div>
        <div className="setting-row about">
          <label>Quick Launch v0.1.0</label>
          <span className="value">MIT License · junhey</span>
        </div>
      </div>
    </div>
  );
}
