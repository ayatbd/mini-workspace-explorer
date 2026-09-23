import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it } from "vitest";

import { ROOT_ID, emptyWorkspace } from "@/lib/filesystem";
import {
  createFolder,
  createTextFile,
  deleteItem,
  openFile,
  renameItem,
  resetWorkspace,
  selectFolder,
  setEditorDraft,
  updateFileContent,
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

  it("rejects path separators and dot names", () => {
    for (const name of [".", "..", "nested/file", "nested\\file"]) {
      const result = store.dispatch(createFolder(ROOT_ID, name));
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    }
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

describe("renameItem / deleteItem", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("renames files and preserves content", () => {
    const created = store.dispatch(
      createTextFile(ROOT_ID, "notes.txt", "hello world"),
    );
    expect(created.success).toBe(true);

    const result = store.dispatch(renameItem(created.value!, "  journal.txt  "));

    expect(result.success).toBe(true);
    const renamed = store.getState().workspace.items[created.value!];
    expect(renamed).toMatchObject({
      name: "journal.txt",
      content: "hello world",
      type: "file",
      parentId: ROOT_ID,
    });
    expect(renamed.updatedAt).toEqual(expect.any(String));
  });

  it("renames folders", () => {
    const created = store.dispatch(createFolder(ROOT_ID, "Drafts"));
    expect(created.success).toBe(true);

    const result = store.dispatch(renameItem(created.value!, "Archive"));

    expect(result.success).toBe(true);
    expect(store.getState().workspace.items[created.value!]?.name).toBe(
      "Archive",
    );
  });

  it("rejects duplicate rename names case-insensitively", () => {
    const folder = store.dispatch(createFolder(ROOT_ID, "Notes"));
    const file = store.dispatch(createTextFile(ROOT_ID, "todo.txt"));
    expect(folder.success).toBe(true);
    expect(file.success).toBe(true);

    const duplicate = store.dispatch(renameItem(file.value!, "notes"));

    expect(duplicate).toEqual({
      success: false,
      error: "An item with that name already exists in this folder.",
    });
    expect(store.getState().workspace.items[file.value!]?.name).toBe(
      "todo.txt",
    );
  });

  it("rejects invalid rename names and preserves the original name", () => {
    const file = store.dispatch(createTextFile(ROOT_ID, "todo.txt"));
    expect(file.success).toBe(true);

    for (const name of ["", "..", "folder/name"]) {
      const result = store.dispatch(renameItem(file.value!, name));
      expect(result.success).toBe(false);
    }

    expect(store.getState().workspace.items[file.value!]?.name).toBe("todo.txt");
  });

  it("falls back to the nearest surviving folder after deleting a selected folder", () => {
    const parent = store.dispatch(createFolder(ROOT_ID, "Documents"));
    const child = store.dispatch(createFolder(parent.value!, "Letters"));
    expect(parent.success).toBe(true);
    expect(child.success).toBe(true);

    store.dispatch(selectFolder(child.value!));
    store.dispatch(deleteItem(parent.value!));

    expect(store.getState().workspace.selectedFolderId).toBe(ROOT_ID);
  });

  it("recursively deletes a folder and all nested contents", () => {
    const parent = store.dispatch(createFolder(ROOT_ID, "Projects"));
    const child = store.dispatch(createFolder(parent.value!, "App"));
    const nestedFile = store.dispatch(
      createTextFile(child.value!, "readme.txt", "nested"),
    );
    const siblingFile = store.dispatch(
      createTextFile(parent.value!, "root.txt", "sibling"),
    );

    expect(parent.success).toBe(true);
    expect(child.success).toBe(true);
    expect(nestedFile.success).toBe(true);
    expect(siblingFile.success).toBe(true);

    const result = store.dispatch(deleteItem(parent.value!));

    expect(result.success).toBe(true);
    expect(result.value).toBe(4);

    const state = store.getState().workspace;
    expect(state.items[parent.value!]).toBeUndefined();
    expect(state.items[child.value!]).toBeUndefined();
    expect(state.items[nestedFile.value!]).toBeUndefined();
    expect(state.items[siblingFile.value!]).toBeUndefined();
    expect(Object.keys(state.items)).toEqual([ROOT_ID]);
  });

  it("navigates to the parent when the selected folder is deleted", () => {
    const parent = store.dispatch(createFolder(ROOT_ID, "Documents"));
    const child = store.dispatch(createFolder(parent.value!, "Letters"));
    expect(parent.success).toBe(true);
    expect(child.success).toBe(true);

    store.dispatch(selectFolder(child.value!));
    expect(store.getState().workspace.selectedFolderId).toBe(child.value);

    const result = store.dispatch(deleteItem(child.value!));

    expect(result.success).toBe(true);
    const state = store.getState().workspace;
    expect(state.selectedFolderId).toBe(parent.value);
    expect(state.items[child.value!]).toBeUndefined();
    expect(state.expandedFolderIds).not.toContain(child.value);
  });

  it("closes the editor and navigates to the parent when an opened file is deleted", () => {
    const folder = store.dispatch(createFolder(ROOT_ID, "Docs"));
    const file = store.dispatch(
      createTextFile(folder.value!, "open.txt", "draft"),
    );
    expect(folder.success).toBe(true);
    expect(file.success).toBe(true);

    store.dispatch(selectFolder(folder.value!));
    store.dispatch(openFile(file.value!));

    expect(store.getState().workspace.openedFileId).toBe(file.value);

    const result = store.dispatch(deleteItem(file.value!));

    expect(result.success).toBe(true);
    const state = store.getState().workspace;
    expect(state.openedFileId).toBeNull();
    expect(state.editorDraft).toBeNull();
    expect(state.selectedFolderId).toBe(folder.value);
    expect(state.items[file.value!]).toBeUndefined();
  });

  it("prevents deleting the root workspace folder", () => {
    const folder = store.dispatch(createFolder(ROOT_ID, "Keep"));
    expect(folder.success).toBe(true);

    const result = store.dispatch(deleteItem(ROOT_ID));

    expect(result).toEqual({
      success: false,
      error: "The workspace folder cannot be deleted.",
    });
    expect(store.getState().workspace.items[ROOT_ID]).toBeTruthy();
    expect(store.getState().workspace.items[folder.value!]).toBeTruthy();
  });

  it("prevents renaming the root workspace folder", () => {
    const result = store.dispatch(renameItem(ROOT_ID, "Home"));

    expect(result).toEqual({
      success: false,
      error: "The workspace folder cannot be renamed.",
    });
    expect(store.getState().workspace.items[ROOT_ID]?.name).toBe("Workspace");
  });
});

describe("text file editor content", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("saves draft content onto the file and clears the draft", () => {
    const file = store.dispatch(createTextFile(ROOT_ID, "notes.txt", "hello"));
    expect(file.success).toBe(true);

    store.dispatch(openFile(file.value!));
    store.dispatch(setEditorDraft("hello world"));

    expect(store.getState().workspace.editorDraft).toBe("hello world");

    const result = store.dispatch(updateFileContent(file.value!, "hello world"));

    expect(result.success).toBe(true);
    const state = store.getState().workspace;
    expect(state.items[file.value!]?.content).toBe("hello world");
    expect(state.editorDraft).toBeNull();
  });

  it("keeps saved content after renaming the open file", () => {
    const file = store.dispatch(
      createTextFile(ROOT_ID, "draft.txt", "keep me"),
    );
    expect(file.success).toBe(true);
    store.dispatch(openFile(file.value!));

    const renamed = store.dispatch(renameItem(file.value!, "final.txt"));
    expect(renamed.success).toBe(true);

    const state = store.getState().workspace;
    expect(state.openedFileId).toBe(file.value);
    expect(state.items[file.value!]).toMatchObject({
      name: "final.txt",
      content: "keep me",
    });
  });

  it("preserves saved file content when selecting another folder", () => {
    const folder = store.dispatch(createFolder(ROOT_ID, "Docs"));
    const file = store.dispatch(
      createTextFile(folder.value!, "memo.txt", "persisted"),
    );
    expect(folder.success).toBe(true);
    expect(file.success).toBe(true);

    store.dispatch(openFile(file.value!));
    store.dispatch(updateFileContent(file.value!, "updated body"));
    store.dispatch(selectFolder(ROOT_ID));

    const state = store.getState().workspace;
    expect(state.openedFileId).toBeNull();
    expect(state.items[file.value!]?.content).toBe("updated body");
  });

  it("selects the parent folder and expands ancestors when opening a file", () => {
    const parent = store.dispatch(createFolder(ROOT_ID, "Projects"));
    const child = store.dispatch(createFolder(parent.value!, "Webbly"));
    const file = store.dispatch(
      createTextFile(child.value!, "notes.txt", "hi"),
    );
    expect(parent.success).toBe(true);
    expect(child.success).toBe(true);
    expect(file.success).toBe(true);

    store.dispatch(selectFolder(ROOT_ID));
    store.dispatch(openFile(file.value!));

    const state = store.getState().workspace;
    expect(state.openedFileId).toBe(file.value);
    expect(state.selectedFolderId).toBe(child.value);
    expect(state.expandedFolderIds).toEqual(
      expect.arrayContaining([ROOT_ID, parent.value, child.value]),
    );
  });
});
