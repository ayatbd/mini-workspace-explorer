"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { buildPath, sortChildren } from "@/lib/filesystem";
import {
  createFolder,
  createTextFile,
  deleteItem,
  openFile,
  renameItem,
  selectFolder,
  setSearchQuery,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from "@/state/workspace-store";
import type { FileSystemItem } from "@/types/filesystem";

function FolderHeader({
  folder,
  onNewFolder,
  onNewFile,
  onRename,
  onDelete,
  onSearch,
}: {
  folder: FileSystemItem;
  onNewFolder: () => void;
  onNewFile: () => void;
  onRename: () => void;
  onDelete: () => void;
  onSearch: () => void;
}) {
  const isRoot = folder.parentId === null;

  return (
    <div className="content-heading folder-header">
      <div>
        <Breadcrumbs folderId={folder.id} />
        <h1>{folder.name}</h1>
      </div>
      <div className="panel-actions" aria-label="Folder actions">
        <button
          className="panel-action primary-action"
          onClick={onNewFolder}
          type="button"
        >
          ＋ New folder
        </button>
        <button className="panel-action" onClick={onNewFile} type="button">
          ＋ New text file
        </button>
        <button
          className="panel-action"
          disabled={isRoot}
          onClick={onRename}
          type="button"
        >
          Rename
        </button>
        <button
          className="panel-action danger-action"
          disabled={isRoot}
          onClick={onDelete}
          type="button"
        >
          Delete
        </button>
        <button
          className="icon-button"
          aria-label="Search this workspace"
          onClick={onSearch}
          type="button"
        >
          ⌕
        </button>
      </div>
    </div>
  );
}

function Breadcrumbs({ folderId }: { folderId: string }) {
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const rootId = useWorkspaceSelector((state) => state.workspace.rootId);
  const dispatch = useWorkspaceDispatch();
  const folder = items[folderId];
  const path = folder ? buildPath({ rootId, items }, folder) : [];

  return (
    <nav className="breadcrumb" aria-label="Folder path">
      {path.map((item, index) => (
        <span className="breadcrumb-segment" key={item.id}>
          {index > 0 && <span aria-hidden="true">/</span>}
          <button
            className={item.id === folderId ? "breadcrumb-current" : ""}
            onClick={() => dispatch(selectFolder(item.id))}
            type="button"
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

function FileListItem({
  item,
  highlighted,
  onOpen,
}: {
  item: FileSystemItem;
  highlighted: boolean;
  onOpen: (item: FileSystemItem) => void;
}) {
  return (
    <button
      className={`item-card${highlighted ? " item-card-highlighted" : ""}`}
      aria-current={highlighted ? "true" : undefined}
      onClick={() => onOpen(item)}
      type="button"
    >
      <span className={`item-icon ${item.type}`} aria-hidden="true">
        {item.type === "folder" ? "▰" : "▤"}
      </span>
      <span className="item-name">{item.name}</span>
      <span className="item-meta">
        {item.type === "folder" ? "Folder" : "Text file"}
      </span>
    </button>
  );
}

function FileList({
  items,
  highlightedItemId,
  onOpen,
}: {
  items: FileSystemItem[];
  highlightedItemId: string | null;
  onOpen: (item: FileSystemItem) => void;
}) {
  return (
    <div className="item-grid" aria-label="Folder contents">
      {items.map((item) => (
        <FileListItem
          item={item}
          highlighted={item.id === highlightedItemId}
          key={item.id}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

function EmptyFolderState({ completelyEmpty }: { completelyEmpty: boolean }) {
  return (
    <div className="state-panel">
      <div className="empty-illustration">{completelyEmpty ? "✦" : "⌁"}</div>
      <h3>
        {completelyEmpty ? "Your workspace is empty" : "This folder is empty"}
      </h3>
      <p>
        {completelyEmpty
          ? "Create a folder or text file to get started."
          : "New files and folders will appear here."}
      </p>
    </div>
  );
}

function ItemForm({
  type,
  onClose,
  onCreated,
}: {
  type: "folder" | "file" | "rename";
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const dispatch = useWorkspaceDispatch();
  const selectedFolderId = useWorkspaceSelector(
    (state) => state.workspace.selectedFolderId,
  );
  const selectedItem = useWorkspaceSelector(
    (state) => state.workspace.items[selectedFolderId],
  );
  const [name, setName] = useState(
    type === "rename" ? (selectedItem?.name ?? "") : "",
  );
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const title =
    type === "rename"
      ? "Rename item"
      : type === "folder"
        ? "Create folder"
        : "Create text file";
  const nameLabel =
    type === "rename"
      ? "New name"
      : `${type === "folder" ? "Folder" : "Text file"} name`;

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

    const result =
      type === "folder"
        ? dispatch(createFolder(selectedFolderId, name))
        : type === "file"
          ? dispatch(createTextFile(selectedFolderId, name))
          : dispatch(renameItem(selectedFolderId, name));

    if (result.success) {
      if (result.value) onCreated?.(result.value);
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
      aria-label={title}
      onKeyDown={handleFormKeyDown}
      onSubmit={submit}
    >
      <label htmlFor="item-name">{nameLabel}</label>
      <div className="item-form-row">
        <input
          id="item-name"
          autoFocus
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "item-name-error" : undefined}
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
        <p className="form-error" id="item-name-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function MainPanel() {
  const dispatch = useWorkspaceDispatch();
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const rootId = useWorkspaceSelector((state) => state.workspace.rootId);
  const selectedFolderId = useWorkspaceSelector(
    (state) => state.workspace.selectedFolderId,
  );
  const searchQuery = useWorkspaceSelector(
    (state) => state.workspace.searchQuery,
  );
  const [formType, setFormType] = useState<"folder" | "file" | "rename" | null>(
    null,
  );
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null,
  );
  const [showSearch, setShowSearch] = useState(false);
  const closeForm = useCallback(() => setFormType(null), []);
  const folder = items[selectedFolderId];
  const children = useMemo(
    () =>
      sortChildren(
        Object.values(items).filter(
          (item) => item.parentId === selectedFolderId,
        ),
      ),
    [items, selectedFolderId],
  );
  const filteredChildren = searchQuery.trim()
    ? children.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      )
    : children;
  const isCompletelyEmpty =
    Object.keys(items).length === 1 && selectedFolderId === rootId;

  useEffect(() => {
    if (
      highlightedItemId &&
      !children.some((item) => item.id === highlightedItemId)
    ) {
      setHighlightedItemId(null);
    }
  }, [children, highlightedItemId]);

  if (!folder || folder.type !== "folder") return null;

  function handleDelete() {
    if (window.confirm(`Delete ${folder.name} and all of its contents?`))
      dispatch(deleteItem(folder.id));
  }

  function handleOpen(item: FileSystemItem) {
    setHighlightedItemId(item.id);
    dispatch(
      item.type === "folder" ? selectFolder(item.id) : openFile(item.id),
    );
  }

  function openCreateForm(type: "folder" | "file" | "rename") {
    setFormType(type);
  }

  return (
    <section className="content-view" aria-labelledby="folder-title">
      <FolderHeader
        folder={folder}
        onNewFolder={() => openCreateForm("folder")}
        onNewFile={() => openCreateForm("file")}
        onRename={() => openCreateForm("rename")}
        onDelete={handleDelete}
        onSearch={() => setShowSearch((visible) => !visible)}
      />
      <h1 className="sr-only" id="folder-title">
        {folder.name}
      </h1>
      {showSearch && (
        <label className="panel-search">
          <span>Search items</span>
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => dispatch(setSearchQuery(event.target.value))}
            placeholder="Filter this folder"
            type="search"
          />
        </label>
      )}
      {formType && (
        <ItemForm
          onClose={closeForm}
          onCreated={setHighlightedItemId}
          type={formType}
        />
      )}
      <p className="subheading panel-count">
        {filteredChildren.length}{" "}
        {filteredChildren.length === 1 ? "item" : "items"}
        {searchQuery ? " matching your search" : " in this folder"}
      </p>
      {children.length === 0 ? (
        <EmptyFolderState completelyEmpty={isCompletelyEmpty} />
      ) : filteredChildren.length === 0 ? (
        <EmptyFolderState completelyEmpty={false} />
      ) : (
        <FileList
          items={filteredChildren}
          highlightedItemId={highlightedItemId}
          onOpen={handleOpen}
        />
      )}
    </section>
  );
}
