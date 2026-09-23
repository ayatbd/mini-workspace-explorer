import { describe, expect, it } from "vitest";

import { ROOT_ID, starterWorkspace } from "@/lib/filesystem";
import { isValidPersistedWorkspace } from "@/lib/workspace-persistence";

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
});
