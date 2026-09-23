import { describe, expect, it } from "vitest";

import { starterWorkspace } from "@/lib/filesystem";
import { searchWorkspace } from "@/lib/workspace-search";

describe("searchWorkspace", () => {
  it("returns no results for an empty or whitespace query", () => {
    expect(searchWorkspace(starterWorkspace, "")).toEqual([]);
    expect(searchWorkspace(starterWorkspace, "   ")).toEqual([]);
  });

  it("trims the query and matches names case-insensitively at any depth", () => {
    const results = searchWorkspace(starterWorkspace, "  WEB  ");
    const webbly = results.find((result) => result.item.name === "Webbly");

    expect(webbly).toBeTruthy();
    expect(webbly?.pathLabel).toBe("Workspace / Projects / Webbly");
    expect(webbly?.item.type).toBe("folder");
    expect(webbly?.match).toBe("name");
  });

  it("searches nested file names across the workspace", () => {
    const results = searchWorkspace(starterWorkspace, "notes");

    expect(results.some((result) => result.item.name === "notes.txt")).toBe(
      true,
    );
    const notes = results.find((result) => result.item.name === "notes.txt");
    expect(notes?.pathLabel).toBe(
      "Workspace / Projects / Webbly / notes.txt",
    );
  });

  it("optionally matches text-file contents", () => {
    const results = searchWorkspace(starterWorkspace, "sketch");

    expect(results).toHaveLength(1);
    expect(results[0]?.item.name).toBe("tasks.txt");
    expect(results[0]?.match).toBe("content");
  });

  it("does not mutate the workspace", () => {
    const before = JSON.stringify(starterWorkspace);
    searchWorkspace(starterWorkspace, "web");
    expect(JSON.stringify(starterWorkspace)).toBe(before);
  });
});
