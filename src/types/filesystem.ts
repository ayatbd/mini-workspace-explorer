export type FileSystemItemType = "folder" | "file";

export type FileSystemItem = {
    id: string;
    name: string;
    type: FileSystemItemType;
    parentId: string | null;
    content?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type WorkspaceView = "folder" | "file" | "empty";
