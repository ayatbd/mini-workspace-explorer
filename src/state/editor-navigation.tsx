"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  setStatusMessage,
  updateFileContent,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from "@/state/workspace-store";

type EditorNavigationContextValue = {
  isDirty: boolean;
  requestNavigation: (action: () => void) => void;
};

const EditorNavigationContext =
  createContext<EditorNavigationContextValue | null>(null);

function UnsavedChangesDialog({
  fileName,
  onStay,
  onDiscard,
  onSaveAndLeave,
}: {
  fileName: string;
  onStay: () => void;
  onDiscard: () => void;
  onSaveAndLeave: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onStay();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStay]);

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-dialog-title"
        aria-describedby="unsaved-dialog-desc"
      >
        <h2 id="unsaved-dialog-title">Unsaved changes</h2>
        <p id="unsaved-dialog-desc">
          “{fileName}” has unsaved changes. Leave this file and lose those
          edits, or save before leaving?
        </p>
        <div className="confirm-dialog-actions">
          <button className="panel-action" onClick={onStay} type="button">
            Stay
          </button>
          <button
            className="panel-action danger-action"
            onClick={onDiscard}
            type="button"
          >
            Discard
          </button>
          <button
            className="panel-action primary-action"
            onClick={onSaveAndLeave}
            type="button"
          >
            Save and leave
          </button>
        </div>
      </div>
    </div>
  );
}

export function EditorNavigationProvider({ children }: { children: ReactNode }) {
  const dispatch = useWorkspaceDispatch();
  const openedFileId = useWorkspaceSelector(
    (state) => state.workspace.openedFileId,
  );
  const editorDraft = useWorkspaceSelector(
    (state) => state.workspace.editorDraft,
  );
  const openedFile = useWorkspaceSelector((state) =>
    openedFileId ? state.workspace.items[openedFileId] : undefined,
  );
  const savedContent = openedFile?.content ?? "";
  const isDirty = Boolean(
    openedFileId &&
      openedFile?.type === "file" &&
      editorDraft !== null &&
      editorDraft !== savedContent,
  );

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      setPendingAction(() => action);
    },
    [isDirty],
  );

  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function handleStay() {
    setPendingAction(null);
  }

  function handleDiscard() {
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }

  function handleSaveAndLeave() {
    if (!openedFileId || editorDraft === null || openedFile?.type !== "file") {
      return;
    }

    const result = dispatch(updateFileContent(openedFileId, editorDraft));
    if (!result.success) {
      dispatch(setStatusMessage(result.error ?? "Could not save that file."));
      return;
    }

    dispatch(setStatusMessage(`Saved "${openedFile.name}".`));
    const action = pendingAction;
    setPendingAction(null);
    action?.();
  }

  return (
    <EditorNavigationContext.Provider value={{ isDirty, requestNavigation }}>
      {children}
      {pendingAction && openedFile?.type === "file" && (
        <UnsavedChangesDialog
          fileName={openedFile.name}
          onStay={handleStay}
          onDiscard={handleDiscard}
          onSaveAndLeave={handleSaveAndLeave}
        />
      )}
    </EditorNavigationContext.Provider>
  );
}

export function useEditorNavigation() {
  const context = useContext(EditorNavigationContext);
  if (!context) {
    throw new Error(
      "useEditorNavigation must be used within an EditorNavigationProvider",
    );
  }
  return context;
}
