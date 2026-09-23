import { describe, expect, it } from "vitest";

import { ROOT_ID, starterWorkspace } from "@/lib/filesystem";
import {
  isValidPersistedWorkspace,
  loadPersistedWorkspace,
  savePersistedWorkspace,
  WORKSPACE_STORAGE_KEY,
} from "@/lib/workspace-persistence";

describe("workspace persistence validation", () => {
  it("accepts a valid workspace snapshot", () => {
    expect(isValidPersistedWorkspace(starterWorkspace)).toBe(true);
  });

  it("rejects snapshots without a root folder", () => {
    expect(
      isValidPersistedWorkspace({
        rootId: ROOT_ID,
        items: {},
      }),
    ).toBe(false);
  });

  it("rejects malformed items", () => {
    expect(
      isValidPersistedWorkspace({
        rootId: ROOT_ID,
        items: {
          [ROOT_ID]: {
            id: ROOT_ID,
            name: "Workspace",
            type: "folder",
            parentId: null,
          },
        },
      }),
    ).toBe(false);
  });

  it("rejects orphaned and cyclic parent links", () => {
    const orphaned = structuredClone(starterWorkspace);
    orphaned.items.notes.parentId = "missing";
    expect(isValidPersistedWorkspace(orphaned)).toBe(false);

    const cyclic = structuredClone(starterWorkspace);
    cyclic.items.projects.parentId = "webbly";
    expect(isValidPersistedWorkspace(cyclic)).toBe(false);
  });

  it("serializes and restores a workspace snapshot", () => {
    const storage = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
      },
    });

    try {
      savePersistedWorkspace(starterWorkspace);
      expect(storage.has(WORKSPACE_STORAGE_KEY)).toBe(true);
      expect(loadPersistedWorkspace()).toEqual(starterWorkspace);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
