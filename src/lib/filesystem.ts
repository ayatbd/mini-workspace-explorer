import type { FileSystemItem } from "@/types/filesystem";

export const starterItems: FileSystemItem[] = [
    {
        id: "projects",
        name: "Projects",
        type: "folder",
        parentId: "root",
    },
    {
        id: "notes",
        name: "Notes",
        type: "folder",
        parentId: "root",
    },
    {
        id: "welcome",
        name: "welcome.txt",
        type: "file",
        parentId: "root",
        content: "Welcome to your workspace.",
    },
];

export function getChildren(items: FileSystemItem[], parentId: string) {
    return items.filter((item) => item.parentId === parentId);
}
