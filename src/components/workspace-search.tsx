"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { searchWorkspace, type WorkspaceSearchResult } from "@/lib/workspace-search";
import { useEditorNavigation } from "@/state/editor-navigation";
import {
  openFile,
  selectFolder,
  setSearchQuery,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from "@/state/workspace-store";

function resultOptionId(listId: string, index: number) {
  return `${listId}-option-${index}`;
}

export function WorkspaceSearch() {
  const dispatch = useWorkspaceDispatch();
  const { requestNavigation } = useEditorNavigation();
  const items = useWorkspaceSelector((state) => state.workspace.items);
  const rootId = useWorkspaceSelector((state) => state.workspace.rootId);
  const searchQuery = useWorkspaceSelector(
    (state) => state.workspace.searchQuery,
  );

  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmedQuery = searchQuery.trim();
  const results = useMemo(
    () => searchWorkspace({ rootId, items }, searchQuery),
    [items, rootId, searchQuery],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, results.length]);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        inputRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  function openResult(result: WorkspaceSearchResult) {
    requestNavigation(() => {
      if (result.item.type === "folder") {
        dispatch(selectFolder(result.item.id));
      } else {
        dispatch(openFile(result.item.id));
      }
      dispatch(setSearchQuery(""));
      setIsOpen(false);
      inputRef.current?.blur();
    });
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (trimmedQuery) {
        dispatch(setSearchQuery(""));
      } else {
        setIsOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    if (!isOpen) setIsOpen(true);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const active = results[activeIndex];
      if (active) openResult(active);
    }
  }

  const activeOptionId =
    results.length > 0 ? resultOptionId(listId, activeIndex) : undefined;

  return (
    <div className="workspace-search" ref={panelRef}>
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          id="workspace-search-input"
          ref={inputRef}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-activedescendant={isOpen ? activeOptionId : undefined}
          aria-label="Search workspace"
          placeholder="Search workspace"
          type="search"
          value={searchQuery}
          onChange={(event) => {
            dispatch(setSearchQuery(event.target.value));
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
        />
        <kbd>⌘ K</kbd>
      </label>

      {isOpen && (
        <div
          className="search-results-panel"
          id={listId}
          role="listbox"
          aria-label="Workspace search results"
        >
          {!trimmedQuery ? (
            <div className="search-empty-state" role="presentation">
              <p className="search-empty-title">Search the whole workspace</p>
              <p>
                Type a name to find folders and files at any depth. Text-file
                contents are included too.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="search-empty-state" role="status">
              <p className="search-empty-title">No results for “{trimmedQuery}”</p>
              <p>
                Try another name, check spelling, or search for words inside a
                text file.
              </p>
            </div>
          ) : (
            <ul className="search-results-list">
              {results.map((result, index) => {
                const isActive = index === activeIndex;
                const typeLabel =
                  result.item.type === "folder" ? "Folder" : "Text file";
                return (
                  <li key={result.item.id} role="presentation">
                    <button
                      id={resultOptionId(listId, index)}
                      className={`search-result${isActive ? " search-result-active" : ""}`}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => openResult(result)}
                    >
                      <span
                        className={`search-result-icon ${result.item.type}`}
                        aria-hidden="true"
                      >
                        {result.item.type === "folder" ? "▰" : "▤"}
                      </span>
                      <span className="search-result-body">
                        <span className="search-result-name">
                          {result.item.name}
                        </span>
                        <span className="search-result-meta">
                          <span className="search-result-type">{typeLabel}</span>
                          {result.match === "content" && (
                            <span className="search-result-match">
                              Match in contents
                            </span>
                          )}
                        </span>
                        <span className="search-result-path">
                          {result.pathLabel}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Focus the workspace-wide search field (used by the folder toolbar). */
export function focusWorkspaceSearch() {
  const input = document.getElementById(
    "workspace-search-input",
  ) as HTMLInputElement | null;
  input?.focus();
  input?.select();
}
