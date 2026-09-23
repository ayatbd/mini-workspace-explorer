"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Provider } from "react-redux";

import {
  loadPersistedWorkspace,
  savePersistedWorkspace,
} from "@/lib/workspace-persistence";
import { EditorNavigationProvider, useEditorNavigation } from "@/state/editor-navigation";
import { store } from "@/state/store";
import {
  hydrateWorkspace,
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
      <WorkspacePersistenceBridge>
        <EditorNavigationProvider>
          <WorkspaceContextBridge>{children}</WorkspaceContextBridge>
        </EditorNavigationProvider>
      </WorkspacePersistenceBridge>
    </Provider>
  );
}

function WorkspacePersistenceBridge({ children }: { children: ReactNode }) {
  const dispatch = useWorkspaceDispatch();

  useEffect(() => {
    const persisted = loadPersistedWorkspace();
    if (persisted) {
      dispatch(hydrateWorkspace(persisted));
    }

    let lastSerialized = "";
    return store.subscribe(() => {
      const state = store.getState().workspace;
      const serialized = JSON.stringify({
        rootId: state.rootId,
        items: state.items,
      });
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      savePersistedWorkspace({ rootId: state.rootId, items: state.items });
    });
  }, [dispatch]);

  return children;
}

function WorkspaceContextBridge({ children }: { children: ReactNode }) {
  const dispatch = useWorkspaceDispatch();
  const { requestNavigation } = useEditorNavigation();
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
          requestNavigation(() => {
            dispatch(
              item.type === "file" ? openFile(item.id) : selectFolder(item.id),
            );
          });
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
