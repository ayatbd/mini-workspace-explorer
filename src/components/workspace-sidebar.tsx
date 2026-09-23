"use client";

import { useMemo, type CSSProperties, type KeyboardEvent } from "react";

import { sortChildren } from "@/lib/filesystem";
import { useEditorNavigation } from "@/state/editor-navigation";
import {
  selectFolder,
  toggleFolderExpansion,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from "@/state/workspace-store";
import type { FileSystemItem } from "@/types/filesystem";

function FolderTreeItem({
  item,
  depth,
}: {
  item: FileSystemItem;
  depth: number;
}) {
  const dispatch = useWorkspaceDispatch();
  const { requestNavigation } = useEditorNavigation();
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const selectedFolderId = useWorkspaceSelector(
    (state) => state.workspace.selectedFolderId,
  );
  const expandedFolderIds = useWorkspaceSelector(
    (state) => state.workspace.expandedFolderIds,
  );
  const children = useMemo(
    () =>
      sortChildren(
        Object.values(items).filter(
          (child) => child.parentId === item.id && child.type === "folder",
        ),
      ),
    [items, item.id],
  );
  const isExpanded = expandedFolderIds.includes(item.id);
  const isSelected = selectedFolderId === item.id;
  const hasChildren = children.length > 0;

  function handleSelectFolder() {
    requestNavigation(() => {
      dispatch(selectFolder(item.id));
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight" && hasChildren && !isExpanded) {
      event.preventDefault();
      dispatch(toggleFolderExpansion(item.id));
    } else if (event.key === "ArrowLeft" && hasChildren && isExpanded) {
      event.preventDefault();
      dispatch(toggleFolderExpansion(item.id));
    }
  }

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      <div
        className={`tree-row ${isSelected ? "tree-item-selected" : ""}`}
        style={{ "--tree-depth": depth } as CSSProperties}
      >
        <button
          className="tree-toggle"
          aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.name}`}
          disabled={!hasChildren}
          onClick={() => dispatch(toggleFolderExpansion(item.id))}
          tabIndex={-1}
          type="button"
        >
          {hasChildren ? (isExpanded ? "⌄" : "›") : ""}
        </button>
        <button
          className="tree-item"
          onClick={handleSelectFolder}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <span className="tree-folder-icon" aria-hidden="true">
            {isExpanded ? "▾" : "▰"}
          </span>
          <span>{item.name}</span>
        </button>
      </div>
      {isExpanded && hasChildren && (
        <div className="tree-children" role="group">
          {children.map((child) => (
            <FolderTreeItem depth={depth + 1} item={child} key={child.id} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree() {
  const rootId = useWorkspaceSelector((state) => state.workspace.rootId);
  const root = useWorkspaceSelector((state) => state.workspace.items[rootId]);
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const folders = Object.values(items).filter(
    (item) => item.type === "folder" && item.id !== rootId,
  );

  return (
    <div className="tree" role="tree" aria-label="Workspace folders">
      {root && <FolderTreeItem depth={0} item={root} />}
      {folders.length === 0 && (
        <p className="tree-empty">No folders created yet.</p>
      )}
    </div>
  );
}

export function WorkspaceSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {isOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close workspace navigation"
          onClick={onClose}
          type="button"
        />
      )}
      <aside
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <div className="sidebar-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Explorer</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close workspace navigation"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <FolderTree />
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Local workspace</span>
          <span className="footer-spacer" />
          <span className="muted-label">Ready</span>
        </div>
      </aside>
    </>
  );
}
