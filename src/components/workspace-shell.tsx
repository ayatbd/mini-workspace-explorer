"use client";

import { useState } from "react";

import { MainPanel } from "@/components/main-panel";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
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
        {view === "file" ? <FileView /> : <MainPanel />}
      </main>
    </div>
  );
}
