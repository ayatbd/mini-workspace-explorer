import type { FileSystemItem, WorkspaceFileSystem } from "@/types/filesystem";

export const ROOT_ID = "root";
const INITIAL_TIMESTAMP = "2024-01-01T00:00:00.000Z";

const rootFolder: Omit<FileSystemItem, "createdAt" | "updatedAt"> = {
    id: ROOT_ID,
    name: "Workspace",
    type: "folder",
    parentId: null,
};

const sampleItems: Array<Omit<FileSystemItem, "createdAt" | "updatedAt">> = [
    { id: "projects", name: "Projects", type: "folder", parentId: ROOT_ID },
    { id: "webbly", name: "Webbly", type: "folder", parentId: "projects" },
    {
        id: "notes",
        name: "notes.txt",
        type: "file",
        parentId: "webbly",
        content: "Ideas for the Webbly project.",
    },
    {
        id: "tasks",
        name: "tasks.txt",
        type: "file",
        parentId: "webbly",
        content: "- Sketch the first screen",
    },
    { id: "documents", name: "Documents", type: "folder", parentId: ROOT_ID },
    {
        id: "readme",
        name: "README.txt",
        type: "file",
        parentId: "documents",
        content: "Welcome to your workspace.",
    },
];

function withTimestamps(
    item: Omit<FileSystemItem, "createdAt" | "updatedAt">,
): FileSystemItem {
    return { ...item, createdAt: INITIAL_TIMESTAMP, updatedAt: INITIAL_TIMESTAMP };
}

export function createWorkspace(includeSampleData = true): WorkspaceFileSystem {
    const items = [rootFolder, ...(includeSampleData ? sampleItems : [])].map(
        withTimestamps,
    );

    return {
        rootId: ROOT_ID,
        items: Object.fromEntries(items.map((item) => [item.id, item])),
    };
}

export const starterWorkspace = createWorkspace(true);
export const emptyWorkspace = createWorkspace(false);
export const workspaceRoot = starterWorkspace.items[ROOT_ID];
export const starterItems = Object.values(starterWorkspace.items).filter(
    (item) => item.id !== ROOT_ID,
);

export function getItem(workspace: WorkspaceFileSystem, itemId: string) {
    return workspace.items[itemId];
}

export function getChildren(workspace: WorkspaceFileSystem, parentId: string) {
    return Object.values(workspace.items).filter((item) => item.parentId === parentId);
}

export function getParentItem(workspace: WorkspaceFileSystem, item: FileSystemItem) {
    return item.parentId ? getItem(workspace, item.parentId) : undefined;
}

export function buildPath(workspace: WorkspaceFileSystem, item: FileSystemItem) {
    const path: FileSystemItem[] = [];
    let current: FileSystemItem | undefined = item;

    while (current) {
        path.unshift(current);
        current = getParentItem(workspace, current);
    }

    return path;
}

export function getDescendants(workspace: WorkspaceFileSystem, folderId: string) {
    const descendants: FileSystemItem[] = [];
    const pending = getChildren(workspace, folderId);

    while (pending.length > 0) {
        const item = pending.shift();
        if (!item) continue;

        descendants.push(item);
        if (item.type === "folder") {
            pending.push(...getChildren(workspace, item.id));
        }
    }

    return descendants;
}

export function containsItem(
    workspace: WorkspaceFileSystem,
    folderId: string,
    itemId: string,
) {
    return getDescendants(workspace, folderId).some((item) => item.id === itemId);
}

export function sortChildren(items: FileSystemItem[]) {
    return [...items].sort((left, right) => {
        if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
        return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    });
}
