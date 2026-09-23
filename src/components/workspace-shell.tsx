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
import { WorkspaceSearch } from "@/components/workspace-search";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { buildPath } from "@/lib/filesystem";
import { useEditorNavigation } from "@/state/editor-navigation";
import { useWorkspace } from "@/state/workspace-context";
import {
  closeFileEditor,
  confirmAndDeleteItem,
  renameItem,
  selectFolder,
  setEditorDraft,
  setStatusMessage,
  updateFileContent,
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
      <WorkspaceSearch />
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

function FileBreadcrumbs({
  fileId,
  onNavigateFolder,
}: {
  fileId: string;
  onNavigateFolder: (folderId: string) => void;
}) {
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const rootId = useWorkspaceSelector((state) => state.workspace.rootId);
  const file = items[fileId];
  const path = file ? buildPath({ rootId, items }, file) : [];

  return (
    <nav className="breadcrumb" aria-label="File location">
      {path.map((item, index) => {
        const isLast = index === path.length - 1;
        return (
          <span className="breadcrumb-segment" key={item.id}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {isLast || item.type === "file" ? (
              <strong className="breadcrumb-current">{item.name}</strong>
            ) : (
              <button
                onClick={() => onNavigateFolder(item.id)}
                type="button"
              >
                {item.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function FileView() {
  const { selectedItem } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const { requestNavigation } = useEditorNavigation();
  const rootId = useWorkspaceSelector((state) => state.workspace.rootId);
  const editorDraft = useWorkspaceSelector(
    (state) => state.workspace.editorDraft,
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const closeRename = useCallback(() => setIsRenaming(false), []);

  const savedContent = selectedItem.content ?? "";
  const value = editorDraft ?? savedContent;
  const isDirty = editorDraft !== null && editorDraft !== savedContent;
  const isEmpty = value.length === 0;

  useEffect(() => {
    if (isDirty) setJustSaved(false);
  }, [isDirty]);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  function handleDelete() {
    confirmAndDeleteItem(selectedItem, 0, dispatch);
  }

  function handleChange(content: string) {
    dispatch(setEditorDraft(content));
  }

  function handleSave() {
    if (!isDirty) return;

    const result = dispatch(updateFileContent(selectedItem.id, value));
    if (result.success) {
      setJustSaved(true);
      dispatch(setStatusMessage(`Saved "${selectedItem.name}".`));
      return;
    }

    dispatch(setStatusMessage(result.error ?? "Could not save that file."));
  }

  function leaveEditor() {
    const parentId = selectedItem.parentId ?? rootId;
    requestNavigation(() => {
      dispatch(selectFolder(parentId));
    });
  }

  function navigateToFolder(folderId: string) {
    requestNavigation(() => {
      dispatch(selectFolder(folderId));
    });
  }

  const statusLabel = justSaved
    ? "Saved"
    : isDirty
      ? "Unsaved changes"
      : "No unsaved changes";
  const statusClass = justSaved
    ? "editor-status editor-status-saved"
    : isDirty
      ? "editor-status editor-status-unsaved"
      : "editor-status";

  return (
    <section className="content-view file-view">
      <div className="content-heading file-header">
        <div>
          <FileBreadcrumbs
            fileId={selectedItem.id}
            onNavigateFolder={navigateToFolder}
          />
          <h1>{selectedItem.name}</h1>
          <p className="subheading">
            Text file ·{" "}
            {justSaved
              ? "All changes saved"
              : isDirty
                ? "Editing — unsaved changes"
                : isEmpty
                  ? "Empty file"
                  : "Ready to edit"}
          </p>
        </div>
        <div className="panel-actions" aria-label="File actions">
          <button className="panel-action" onClick={leaveEditor} type="button">
            Back
          </button>
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
          <button
            className={`save-button${justSaved && !isDirty ? " save-button-success" : ""}`}
            disabled={!isDirty}
            onClick={handleSave}
            type="button"
          >
            {justSaved && !isDirty ? "Saved" : "Save changes"}
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
          <span className="editor-file-name">{selectedItem.name}</span>
          <span className={statusClass} role="status">
            {statusLabel}
          </span>
        </div>
        {isEmpty && (
          <p className="editor-empty-hint">
            This file is empty. Start typing to add content.
          </p>
        )}
        <textarea
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Start typing…"
          aria-label={`Edit ${selectedItem.name}`}
          spellCheck
        />
      </div>
      <div className="editor-footer-actions">
        <button className="panel-action" onClick={leaveEditor} type="button">
          Cancel
        </button>
        <button
          className={`save-button${justSaved && !isDirty ? " save-button-success" : ""}`}
          disabled={!isDirty}
          onClick={handleSave}
          type="button"
        >
          {justSaved && !isDirty ? "Saved" : "Save changes"}
        </button>
      </div>
    </section>
  );
}

export function WorkspaceShell() {
  const { view } = useWorkspace();
  const dispatch = useWorkspaceDispatch();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const openedFileId = useWorkspaceSelector(
    (state) => state.workspace.openedFileId,
  );
  const openedFile = useWorkspaceSelector((state) =>
    openedFileId ? state.workspace.items[openedFileId] : undefined,
  );

  // Belt-and-suspenders: if the open file disappears, close the editor safely.
  useEffect(() => {
    if (openedFileId && (!openedFile || openedFile.type !== "file")) {
      dispatch(closeFileEditor());
    }
  }, [dispatch, openedFile, openedFileId]);

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
