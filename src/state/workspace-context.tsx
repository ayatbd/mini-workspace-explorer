"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Provider } from "react-redux";

import { store } from "@/state/store";
import {
  openFile,
  selectFolder,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from "@/state/workspace-store";
import type { FileSystemItem, WorkspaceView } from "@/types/filesystem";

type WorkspaceContextValue = {
  selectedItem: FileSystemItem;
  view: WorkspaceView;
  selectItem: (item: FileSystemItem) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <WorkspaceContextBridge>{children}</WorkspaceContextBridge>
    </Provider>
  );
}

function WorkspaceContextBridge({ children }: { children: ReactNode }) {
  const dispatch = useWorkspaceDispatch();
  const selectedFolderId = useWorkspaceSelector(
    (state) => state.workspace.selectedFolderId,
  );
  const openedFileId = useWorkspaceSelector(
    (state) => state.workspace.openedFileId,
  );
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const selectedItem = items[openedFileId ?? selectedFolderId];

  if (!selectedItem) return null;

  const view: WorkspaceView = selectedItem.type === "file" ? "file" : "folder";

  return (
    <WorkspaceContext.Provider
      value={{
        selectedItem,
        view,
        selectItem: (item) => {
          dispatch(
            item.type === "file" ? openFile(item.id) : selectFolder(item.id),
          );
        },
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
