"use client";

import { useWorkspaceItems } from "@/hooks/use-workspace-items";
import { useWorkspace } from "@/state/workspace-context";
import type { FileSystemItem } from "@/types/filesystem";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="icon">
      {children}
    </span>
  );
}

function SidebarItem({ item }: { item: FileSystemItem }) {
  const { selectedItem, selectItem } = useWorkspace();
  const isSelected = selectedItem.id === item.id;

  return (
    <button
      className={`tree-item ${isSelected ? "tree-item-selected" : ""}`}
      onClick={() => selectItem(item)}
      type="button"
    >
      <Icon>{isSelected ? "⌄" : "›"}</Icon>
      <span className="tree-folder-icon">▰</span>
      <span>{item.name}</span>
    </button>
  );
}

function Sidebar() {
  const { selectedItem, selectItem } = useWorkspace();
  const { items } = useWorkspaceItems();
  const folders = items.filter((item) => item.type === "folder");

  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="sidebar-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2>Explorer</h2>
        </div>
        <button
          className="icon-button"
          aria-label="More workspace options"
          type="button"
        >
          •••
        </button>
      </div>
      <div className="tree" role="tree">
        <button
          className={`tree-item ${selectedItem.id === "root" ? "tree-item-selected" : ""}`}
          aria-selected={selectedItem.id === "root"}
          onClick={() =>
            selectItem({
              id: "root",
              name: "Workspace",
              type: "folder",
              parentId: null,
            })
          }
          role="treeitem"
          type="button"
        >
          <Icon>⌄</Icon>
          <span className="tree-folder-icon">▰</span>
          <span>Workspace</span>
        </button>
        <div className="tree-children">
          {folders.map((item) => (
            <SidebarItem item={item} key={item.id} />
          ))}
        </div>
      </div>
      <div className="sidebar-footer">
        <span className="status-dot" />
        <span>Local workspace</span>
        <span className="footer-spacer" />
        <span className="muted-label">Ready</span>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="toolbar">
      <div className="mobile-brand">
        <span className="brand-mark">✦</span>
        <span>Mini Workspace</span>
      </div>
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input placeholder="Search workspace" type="search" />
        <kbd>⌘ K</kbd>
      </label>
      <div className="toolbar-actions">
        <button className="toolbar-button" type="button">
          <span>＋</span> New
        </button>
        <button className="icon-button" aria-label="Settings" type="button">
          ⚙
        </button>
        <div className="avatar" aria-label="User profile">
          MW
        </div>
      </div>
    </header>
  );
}

function FolderView() {
  const { selectedItem } = useWorkspace();
  const { items, isLoading, error } = useWorkspaceItems();
  const children = items.filter((item) => item.parentId === selectedItem.id);

  return (
    <section className="content-view">
      <div className="content-heading">
        <div>
          <p className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{selectedItem.name}</strong>
          </p>
          <h1>{selectedItem.name}</h1>
          <p className="subheading">{children.length} items in this folder</p>
        </div>
        <div className="view-actions">
          <button className="icon-button" aria-label="Sort items" type="button">
            ↕
          </button>
          <button
            className="icon-button active-icon"
            aria-label="Grid view"
            type="button"
          >
            ⊞
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="state-panel">
          <span className="loader" />
          <h3>Loading workspace</h3>
          <p>Preparing your files and folders.</p>
        </div>
      )}
      {error && (
        <div className="state-panel error-state">
          <h3>Couldn’t load this folder</h3>
          <p>{error}</p>
        </div>
      )}
      {!isLoading && !error && children.length === 0 && (
        <div className="state-panel">
          <div className="empty-illustration">⌁</div>
          <h3>This folder is empty</h3>
          <p>New files and folders will appear here.</p>
        </div>
      )}
      {!isLoading && !error && children.length > 0 && (
        <div className="item-grid">
          {children.map((item) => (
            <button
              className="item-card"
              key={item.id}
              onClick={() => undefined}
              type="button"
            >
              <span className={`item-icon ${item.type}`}>
                {item.type === "folder" ? "▰" : "▤"}
              </span>
              <span className="item-name">{item.name}</span>
              <span className="item-meta">
                {item.type === "folder" ? "Folder" : "Text file"}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function FileView() {
  const { selectedItem } = useWorkspace();

  return (
    <section className="content-view file-view">
      <div className="content-heading">
        <div>
          <p className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{selectedItem.name}</strong>
          </p>
          <h1>{selectedItem.name}</h1>
          <p className="subheading">Text file · Ready to edit</p>
        </div>
        <button className="save-button" type="button">
          Save changes
        </button>
      </div>
      <div className="editor-placeholder">
        <div className="editor-bar">
          <span className="file-dot" />
          {selectedItem.name}
          <span className="editor-status">No unsaved changes</span>
        </div>
        <textarea
          defaultValue={selectedItem.content ?? ""}
          aria-label={`Edit ${selectedItem.name}`}
        />
      </div>
    </section>
  );
}

export function WorkspaceShell() {
  const { view } = useWorkspace();

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Header />
        {view === "file" ? <FileView /> : <FolderView />}
      </main>
    </div>
  );
}
