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

  const hasValidItems = Object.entries(data.items).every(
    ([id, item]) => id === item.id && isFileSystemItem(item),
  );
  if (!hasValidItems) return false;

  for (const item of Object.values(data.items)) {
    if (item.id === data.rootId) continue;
    const parent = item.parentId ? data.items[item.parentId] : undefined;
    if (!parent || parent.type !== "folder") return false;
  }

  for (const item of Object.values(data.items)) {
    const visited = new Set<string>();
    let current: FileSystemItem | undefined = item;
    while (current && current.id !== data.rootId) {
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      current = current.parentId ? data.items[current.parentId] : undefined;
    }
    if (!current) return false;
  }

  return true;
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
