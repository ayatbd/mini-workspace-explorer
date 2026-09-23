import { buildPath } from "@/lib/filesystem";
import type { FileSystemItem, WorkspaceFileSystem } from "@/types/filesystem";

export type SearchMatchReason = "name" | "content" | "both";

export type WorkspaceSearchResult = {
  item: FileSystemItem;
  path: FileSystemItem[];
  pathLabel: string;
  match: SearchMatchReason;
};

function matchRank(match: SearchMatchReason) {
  return match === "content" ? 1 : 0;
}

/**
 * Pure, read-only workspace search. Does not mutate the filesystem.
 * Trims the query and matches case-insensitively on names (and file contents).
 */
export function searchWorkspace(
  workspace: WorkspaceFileSystem,
  rawQuery: string,
): WorkspaceSearchResult[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const results: WorkspaceSearchResult[] = [];

  for (const item of Object.values(workspace.items)) {
    if (item.id === workspace.rootId) continue;

    const nameMatch = item.name.toLowerCase().includes(query);
    const contentMatch =
      item.type === "file" &&
      (item.content ?? "").toLowerCase().includes(query);

    if (!nameMatch && !contentMatch) continue;

    const path = buildPath(workspace, item);
    results.push({
      item,
      path,
      pathLabel: path.map((segment) => segment.name).join(" / "),
      match: nameMatch && contentMatch ? "both" : nameMatch ? "name" : "content",
    });
  }

  return results.sort((left, right) => {
    const byMatch = matchRank(left.match) - matchRank(right.match);
    if (byMatch !== 0) return byMatch;
    if (left.item.type !== right.item.type) {
      return left.item.type === "folder" ? -1 : 1;
    }
    return left.item.name.localeCompare(right.item.name, undefined, {
      sensitivity: "base",
    });
  });
}
