import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it } from "vitest";

import { ROOT_ID, emptyWorkspace } from "@/lib/filesystem";
import {
  createFolder,
  createTextFile,
  resetWorkspace,
  selectFolder,
  workspaceReducer,
} from "@/state/workspace-store";

function createTestStore() {
  const store = configureStore({
    reducer: { workspace: workspaceReducer },
  });
  store.dispatch(resetWorkspace(emptyWorkspace));
  return store;
}

describe("createFolder / createTextFile", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("rejects empty names", () => {
    const folderResult = store.dispatch(createFolder(ROOT_ID, ""));
    const fileResult = store.dispatch(createTextFile(ROOT_ID, ""));

    expect(folderResult).toEqual({
      success: false,
      error: "Name cannot be empty.",
    });
    expect(fileResult).toEqual({
      success: false,
      error: "Name cannot be empty.",
    });
    expect(Object.keys(store.getState().workspace.items)).toEqual([ROOT_ID]);
  });

  it("rejects whitespace-only names", () => {
    const folderResult = store.dispatch(createFolder(ROOT_ID, "   "));
    const fileResult = store.dispatch(createTextFile(ROOT_ID, "\t\n "));

    expect(folderResult.success).toBe(false);
    expect(folderResult.error).toBe("Name cannot be empty.");
    expect(fileResult.success).toBe(false);
    expect(fileResult.error).toBe("Name cannot be empty.");
    expect(Object.keys(store.getState().workspace.items)).toEqual([ROOT_ID]);
  });

  it("rejects duplicate names within the same parent folder", () => {
    const first = store.dispatch(createFolder(ROOT_ID, "Notes"));
    expect(first.success).toBe(true);

    const duplicateFolder = store.dispatch(createFolder(ROOT_ID, "Notes"));
    const duplicateFile = store.dispatch(createTextFile(ROOT_ID, "Notes"));

    expect(duplicateFolder).toEqual({
      success: false,
      error: "An item with that name already exists in this folder.",
    });
    expect(duplicateFile).toEqual({
      success: false,
      error: "An item with that name already exists in this folder.",
    });
  });

  it("rejects case-insensitive duplicate names", () => {
    const first = store.dispatch(createTextFile(ROOT_ID, "readme.txt"));
    expect(first.success).toBe(true);

    const duplicate = store.dispatch(createFolder(ROOT_ID, "README.TXT"));

    expect(duplicate).toEqual({
      success: false,
      error: "An item with that name already exists in this folder.",
    });
  });

  it("creates a valid empty folder in the selected folder", () => {
    const result = store.dispatch(createFolder(ROOT_ID, "  Drafts  "));

    expect(result.success).toBe(true);
    expect(result.value).toBeTruthy();

    const state = store.getState().workspace;
    const created = state.items[result.value!];

    expect(created).toMatchObject({
      id: result.value,
      name: "Drafts",
      type: "folder",
      parentId: ROOT_ID,
    });
    expect(created.content).toBeUndefined();
    expect(
      Object.values(state.items).filter((item) => item.parentId === result.value),
    ).toEqual([]);
    expect(state.selectedFolderId).toBe(ROOT_ID);
  });

  it("creates a valid empty text file in the selected folder", () => {
    const parent = store.dispatch(createFolder(ROOT_ID, "Docs"));
    expect(parent.success).toBe(true);

    store.dispatch(selectFolder(parent.value!));

    const result = store.dispatch(
      createTextFile(parent.value!, "  hello.txt  "),
    );

    expect(result.success).toBe(true);
    expect(result.value).toBeTruthy();

    const state = store.getState().workspace;
    const created = state.items[result.value!];

    expect(created).toMatchObject({
      id: result.value,
      name: "hello.txt",
      type: "file",
      parentId: parent.value,
      content: "",
    });
    expect(state.selectedFolderId).toBe(parent.value);
  });
});
