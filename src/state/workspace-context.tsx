"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { FileSystemItem, WorkspaceView } from "@/types/filesystem";

const rootFolder: FileSystemItem = {
  id: "root",
  name: "Workspace",
  type: "folder",
  parentId: null,
};

type WorkspaceContextValue = {
  selectedItem: FileSystemItem;
  view: WorkspaceView;
  selectItem: (item: FileSystemItem) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [selectedItem, setSelectedItem] = useState<FileSystemItem>(rootFolder);

  const view: WorkspaceView = selectedItem.type === "file" ? "file" : "folder";

  return (
    <WorkspaceContext.Provider
      value={{
        selectedItem,
        view,
        selectItem: setSelectedItem,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
