import type { FileSystemItem, WorkspaceFileSystem } from "@/types/filesystem";

export const WORKSPACE_STORAGE_KEY = "mini-workspace-explorer:v1";

type PersistedWorkspace = {
  rootId: string;
  items: Record<string, FileSystemItem>;
};

function isFileSystemItem(value: unknown): value is FileSystemItem {
  if (!value || typeof value !== "object") return false;
  const item = value as FileSystemItem;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    (item.type === "file" || item.type === "folder") &&
    (item.parentId === null || typeof item.parentId === "string") &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string" &&
    (item.content === undefined || typeof item.content === "string")
  );
}

export function isValidPersistedWorkspace(
  value: unknown,
): value is PersistedWorkspace {
  if (!value || typeof value !== "object") return false;
  const data = value as PersistedWorkspace;
  if (typeof data.rootId !== "string" || !data.items || typeof data.items !== "object") {
    return false;
  }

  const root = data.items[data.rootId];
  if (!root || root.type !== "folder" || root.parentId !== null) return false;

  return Object.entries(data.items).every(
    ([id, item]) => id === item.id && isFileSystemItem(item),
  );
}

export function loadPersistedWorkspace(): WorkspaceFileSystem | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedWorkspace(parsed)) return null;
    return { rootId: parsed.rootId, items: parsed.items };
  } catch {
    return null;
  }
}

export function savePersistedWorkspace(workspace: WorkspaceFileSystem) {
  if (typeof window === "undefined") return;

  try {
    const payload: PersistedWorkspace = {
      rootId: workspace.rootId,
      items: workspace.items,
    };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures; in-memory state still works.
  }
}
