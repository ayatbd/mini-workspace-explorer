"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

import { getChildren, getDescendants, starterWorkspace } from "@/lib/filesystem";
import type { AppDispatch, RootState } from "@/state/store";
import type { FileSystemItem, WorkspaceFileSystem } from "@/types/filesystem";

export type WorkspaceHydrationStatus = "loading" | "hydrated" | "error";
export type WorkspaceActionResult<T = void> = { success: boolean; error?: string; value?: T };

export type WorkspaceState = {
    items: Record<string, FileSystemItem>;
    rootId: string;
    selectedFolderId: string;
    openedFileId: string | null;
    expandedFolderIds: string[];
    searchQuery: string;
    hydrationStatus: WorkspaceHydrationStatus;
    editorDraft: string | null;
};

const initialState: WorkspaceState = {
    items: starterWorkspace.items,
    rootId: starterWorkspace.rootId,
    selectedFolderId: starterWorkspace.rootId,
    openedFileId: null,
    expandedFolderIds: [starterWorkspace.rootId],
    searchQuery: "",
    hydrationStatus: "hydrated",
    editorDraft: null,
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        selectFolder(state, action: PayloadAction<string>) { state.selectedFolderId = action.payload; state.openedFileId = null; state.editorDraft = null; },
        openFile(state, action: PayloadAction<string>) { state.openedFileId = action.payload; state.editorDraft = null; },
        closeFileEditor(state) { state.openedFileId = null; state.editorDraft = null; },
        expandFolder(state, action: PayloadAction<string>) { if (!state.expandedFolderIds.includes(action.payload)) state.expandedFolderIds.push(action.payload); },
        collapseFolder(state, action: PayloadAction<string>) { state.expandedFolderIds = state.expandedFolderIds.filter((id) => id !== action.payload); },
        createItem(state, action: PayloadAction<FileSystemItem>) { state.items[action.payload.id] = action.payload; if (!state.expandedFolderIds.includes(action.payload.parentId!)) state.expandedFolderIds.push(action.payload.parentId!); },
        renameItem(state, action: PayloadAction<{ itemId: string; name: string }>) { const item = state.items[action.payload.itemId]; if (item) { item.name = action.payload.name; item.updatedAt = new Date().toISOString(); } },
        deleteItems(state, action: PayloadAction<{ deletedIds: string[]; parentId: string }>) {
            const deletedIds = new Set(action.payload.deletedIds);
            for (const id of deletedIds) delete state.items[id];
            if (deletedIds.has(state.selectedFolderId)) state.selectedFolderId = action.payload.parentId;
            if (state.openedFileId && deletedIds.has(state.openedFileId)) { state.openedFileId = null; state.editorDraft = null; }
            state.expandedFolderIds = state.expandedFolderIds.filter((id) => !deletedIds.has(id));
        },
        updateFileContent(state, action: PayloadAction<{ fileId: string; content: string }>) { const file = state.items[action.payload.fileId]; if (file?.type === "file") { file.content = action.payload.content; file.updatedAt = new Date().toISOString(); state.editorDraft = null; } },
        setEditorDraft(state, action: PayloadAction<string>) { state.editorDraft = action.payload; },
        resetWorkspace(_state, action: PayloadAction<WorkspaceFileSystem>) { return { ...initialState, items: action.payload.items, rootId: action.payload.rootId, selectedFolderId: action.payload.rootId, expandedFolderIds: [action.payload.rootId] }; },
        setSearchQuery(state, action: PayloadAction<string>) { state.searchQuery = action.payload; },
    },
});

export const workspaceReducer = workspaceSlice.reducer;
const actions = workspaceSlice.actions;
const ok = (): WorkspaceActionResult => ({ success: true });
const fail = (error: string): WorkspaceActionResult => ({ success: false, error });

function folder(state: WorkspaceState, id: string) { const item = state.items[id]; return item?.type === "folder" ? item : undefined; }
function nameError(name: string) { const trimmed = name.trim(); if (!trimmed) return "Name cannot be empty."; if (trimmed === "." || trimmed === "..") return "Name cannot be . or .."; if (/[\\/]/.test(trimmed)) return "Name cannot contain path separators."; return undefined; }
function duplicate(state: WorkspaceState, parentId: string, name: string, ignoredId?: string) { return getChildren({ rootId: state.rootId, items: state.items }, parentId).some((item) => item.id !== ignoredId && item.name.toLowerCase() === name.toLowerCase()); }
function newId(items: Record<string, FileSystemItem>) { let id = globalThis.crypto?.randomUUID?.(); while (!id || items[id]) id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`; return id; }

export const selectFolder = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState().workspace;
    if (!folder(state, id)) return fail("That folder no longer exists.");

    const ancestors: string[] = [];
    let current = state.items[id];
    while (current.parentId) {
        ancestors.push(current.parentId);
        current = state.items[current.parentId]!;
    }

    dispatch(actions.selectFolder(id));
    for (const ancestorId of ancestors) dispatch(actions.expandFolder(ancestorId));
    return ok();
};
export const openFile = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => { if (getState().workspace.items[id]?.type !== "file") return fail("That text file no longer exists."); dispatch(actions.openFile(id)); return ok(); };
export const closeFileEditor = () => (dispatch: AppDispatch) => { dispatch(actions.closeFileEditor()); return ok(); };
export const expandFolder = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => { if (!folder(getState().workspace, id)) return fail("That folder no longer exists."); dispatch(actions.expandFolder(id)); return ok(); };
export const collapseFolder = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => { if (!folder(getState().workspace, id)) return fail("That folder no longer exists."); dispatch(actions.collapseFolder(id)); return ok(); };
export const toggleFolderExpansion = (id: string) => (dispatch: AppDispatch, getState: () => RootState) => { const state = getState().workspace; if (!folder(state, id)) return fail("That folder no longer exists."); dispatch(state.expandedFolderIds.includes(id) ? actions.collapseFolder(id) : actions.expandFolder(id)); return ok(); };

function createItem(parentId: string, name: string, type: "folder" | "file", content = "") { return (dispatch: AppDispatch, getState: () => RootState): WorkspaceActionResult<string> => { const state = getState().workspace; const trimmed = name.trim(); const error = nameError(name); if (!folder(state, parentId)) return { success: false, error: "Choose an existing folder." }; if (error) return { success: false, error }; if (duplicate(state, parentId, trimmed)) return { success: false, error: "An item with that name already exists in this folder." }; const id = newId(state.items); const timestamp = new Date().toISOString(); dispatch(actions.createItem({ id, name: trimmed, type, parentId, createdAt: timestamp, updatedAt: timestamp, ...(type === "file" ? { content } : {}) })); return { success: true, value: id }; }; }
export const createFolder = (parentId: string, name: string) => createItem(parentId, name, "folder");
export const createTextFile = (parentId: string, name: string, content = "") => createItem(parentId, name, "file", content);
export const renameItem = (itemId: string, name: string) => (dispatch: AppDispatch, getState: () => RootState) => { const state = getState().workspace; const item = state.items[itemId]; const trimmed = name.trim(); const error = nameError(name); if (!item) return fail("That item no longer exists."); if (itemId === state.rootId) return fail("The workspace folder cannot be renamed."); if (error) return fail(error); if (duplicate(state, item.parentId!, trimmed, itemId)) return fail("An item with that name already exists in this folder."); dispatch(actions.renameItem({ itemId, name: trimmed })); return ok(); };
export const deleteItem = (itemId: string) => (dispatch: AppDispatch, getState: () => RootState) => { const state = getState().workspace; const item = state.items[itemId]; if (!item) return fail("That item no longer exists."); if (itemId === state.rootId) return fail("The workspace folder cannot be deleted."); const deletedIds = [itemId, ...getDescendants({ rootId: state.rootId, items: state.items }, itemId).map((descendant) => descendant.id)]; dispatch(actions.deleteItems({ deletedIds, parentId: item.parentId ?? state.rootId })); return ok(); };
export const updateFileContent = (fileId: string, content: string) => (dispatch: AppDispatch, getState: () => RootState) => { if (getState().workspace.items[fileId]?.type !== "file") return fail("That text file no longer exists."); dispatch(actions.updateFileContent({ fileId, content })); return ok(); };
export const setEditorDraft = (content: string) => (dispatch: AppDispatch, getState: () => RootState) => { if (!getState().workspace.openedFileId) return fail("Open a text file before editing."); dispatch(actions.setEditorDraft(content)); return ok(); };
export const resetWorkspace = (workspace = starterWorkspace) => (dispatch: AppDispatch) => { dispatch(actions.resetWorkspace(workspace)); return ok(); };
export const setSearchQuery = (query: string) => (dispatch: AppDispatch) => { dispatch(actions.setSearchQuery(query)); return ok(); };

export const useWorkspaceDispatch: () => AppDispatch = useDispatch;
export const useWorkspaceSelector: TypedUseSelectorHook<RootState> = useSelector;
