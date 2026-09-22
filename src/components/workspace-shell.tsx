"use client";

import { useState } from "react";

import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { useWorkspaceItems } from "@/hooks/use-workspace-items";
import { useWorkspace } from "@/state/workspace-context";

function Header({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className="toolbar">
      <div className="mobile-brand">
        <button
          className="icon-button mobile-menu-button"
          aria-label="Open workspace navigation"
          onClick={onOpenSidebar}
          type="button"
        >
          ☰
        </button>
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
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <WorkspaceSidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-area">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        {view === "file" ? <FileView /> : <FolderView />}
      </main>
    </div>
  );
}
