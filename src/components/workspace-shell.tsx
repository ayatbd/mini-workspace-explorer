"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { MainPanel } from "@/components/main-panel";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { useWorkspace } from "@/state/workspace-context";
import {
  confirmAndDeleteItem,
  renameItem,
  setStatusMessage,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from "@/state/workspace-store";

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

function StatusBanner() {
  const dispatch = useWorkspaceDispatch();
  const statusMessage = useWorkspaceSelector(
    (state) => state.workspace.statusMessage,
  );

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => {
      dispatch(setStatusMessage(null));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [dispatch, statusMessage]);

  if (!statusMessage) return null;

  return (
    <p className="status-banner" role="status">
      {statusMessage}
    </p>
  );
}

function RenameFileForm({
  fileId,
  currentName,
  onClose,
}: {
  fileId: string;
  currentName: string;
  onClose: () => void;
}) {
  const dispatch = useWorkspaceDispatch();
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);

    const result = dispatch(renameItem(fileId, name));
    if (result.success) {
      onClose();
      return;
    }

    submittingRef.current = false;
    setSubmitting(false);
    setError(result.error);
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <form
      className="item-form"
      aria-label="Rename text file"
      onKeyDown={handleFormKeyDown}
      onSubmit={submit}
    >
      <label htmlFor="file-rename-name">New name</label>
      <div className="item-form-row">
        <input
          id="file-rename-name"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "file-rename-error" : undefined}
          disabled={submitting}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
        />
        <button
          className="panel-action primary-action"
          disabled={submitting}
          type="submit"
        >
          Save
        </button>
        <button
          className="panel-action"
          disabled={submitting}
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="form-error" id="file-rename-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function FileView() {
  const { selectedItem } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const [isRenaming, setIsRenaming] = useState(false);
  const closeRename = useCallback(() => setIsRenaming(false), []);

  function handleDelete() {
    confirmAndDeleteItem(selectedItem, 0, dispatch);
  }

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
        <div className="panel-actions" aria-label="File actions">
          <button
            className="panel-action"
            onClick={() => setIsRenaming(true)}
            type="button"
          >
            Rename
          </button>
          <button
            className="panel-action danger-action"
            onClick={handleDelete}
            type="button"
          >
            Delete
          </button>
          <button className="save-button" type="button">
            Save changes
          </button>
        </div>
      </div>
      {isRenaming && (
        <RenameFileForm
          fileId={selectedItem.id}
          currentName={selectedItem.name}
          onClose={closeRename}
        />
      )}
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
        <StatusBanner />
        {view === "file" ? <FileView /> : <MainPanel />}
      </main>
    </div>
  );
}
