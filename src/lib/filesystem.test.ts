import { describe, expect, it } from "vitest";

import {
    buildPath,
    containsItem,
    getChildren,
    getDescendants,
    starterWorkspace,
} from "@/lib/filesystem";

const projects = starterWorkspace.items.projects;
const webbly = starterWorkspace.items.webbly;
const notes = starterWorkspace.items.notes;

describe("filesystem traversal", () => {
    it("gets direct children without including deeper descendants", () => {
        expect(getChildren(starterWorkspace, "projects").map((item) => item.id)).toEqual([
            "webbly",
        ]);
        expect(getChildren(starterWorkspace, "webbly").map((item) => item.id)).toEqual([
            "notes",
            "tasks",
        ]);
    });

    it("builds a path from the root to an item", () => {
        expect(buildPath(starterWorkspace, notes).map((item) => item.id)).toEqual([
            "root",
            "projects",
            "webbly",
            "notes",
        ]);
    });

    it("traverses all descendants breadth-first", () => {
        expect(getDescendants(starterWorkspace, projects.id).map((item) => item.id)).toEqual([
            "webbly",
            "notes",
            "tasks",
        ]);
    });

    it("finds descendants while excluding the folder itself", () => {
        expect(containsItem(starterWorkspace, projects.id, webbly.id)).toBe(true);
        expect(containsItem(starterWorkspace, projects.id, projects.id)).toBe(false);
        expect(containsItem(starterWorkspace, webbly.id, "documents")).toBe(false);
    });
});
