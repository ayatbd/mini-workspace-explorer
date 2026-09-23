# Mini Workspace Explorer

Mini Workspace Explorer is a browser-based file explorer for organizing nested folders and text files. It includes a folder tree, breadcrumb navigation, text editing, workspace-wide search, and browser persistence.

The application is local-first: workspace data is kept in the browser and no server-side file system or account is required.

## Features

- Nested folders with unlimited recursive depth.
- Text file creation and editing.
- Create, rename, and delete folders and files.
- Recursive folder deletion with confirmation.
- Search by folder name, file name, and text-file content.
- Breadcrumb navigation and ancestor expansion.
- Browser persistence through `localStorage`.
- Unsaved-change protection when navigating away.
- Responsive desktop and mobile layout.
- Accessible labels, status messages, focus states, and keyboard navigation.

## Technologies

- Next.js 16 App Router
- React 19
- TypeScript
- Redux Toolkit and React Redux
- Vitest
- ESLint with `eslint-config-next`
- Tailwind CSS 4 and PostCSS tooling

## Installation

Requirements: Node.js 20+ and npm 10+ are recommended.

```bash
git clone <GITHUB_REPOSITORY_URL>
cd mini-workspace-explorer
npm install
```

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run the production build locally:

```bash
npm run build
npm run start
```

## Quality Commands

```bash
npm run lint                  # ESLint
npm exec tsc -- --noEmit      # TypeScript type check
npm test                      # Unit tests
npm run test:watch            # Vitest watch mode
npm run build                 # Production build
```

## Project Structure

```text
.
├── src/
│   ├── app/
│   │   ├── globals.css             # Global styles and responsive layout
│   │   ├── layout.tsx              # Root layout and metadata
│   │   └── page.tsx                # Application entry page
│   ├── components/
│   │   ├── main-panel.tsx          # Folder contents, forms, and item actions
│   │   ├── workspace-search.tsx    # Search and keyboard navigation
│   │   ├── workspace-shell.tsx     # Header, editor, and main shell
│   │   └── workspace-sidebar.tsx   # Recursive folder tree and mobile navigation
│   ├── hooks/
│   │   └── use-workspace-items.ts
│   ├── lib/
│   │   ├── filesystem.ts           # Tree traversal, paths, sorting, and fixtures
│   │   ├── filesystem.test.ts
│   │   ├── workspace-persistence.ts
│   │   ├── workspace-persistence.test.ts
│   │   ├── workspace-search.ts
│   │   └── workspace-search.test.ts
│   ├── state/
│   │   ├── editor-navigation.tsx   # Unsaved-change navigation protection
│   │   ├── store.ts                 # Redux store
│   │   ├── workspace-context.tsx   # Provider and persistence bridge
│   │   ├── workspace-store.ts      # Workspace state and actions
│   │   └── workspace-store.test.ts
│   └── types/
│       └── filesystem.ts           # File and workspace models
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.mts
```

## State Management

Redux Toolkit owns the workspace state. The slice stores normalized file-system data and transient UI state:

- `items`: item records keyed by stable ID.
- `rootId`: workspace root folder ID.
- `selectedFolderId`: folder shown in the main panel.
- `openedFileId`: currently open file, if any.
- `expandedFolderIds`: expanded sidebar folders.
- `searchQuery`: current search input.
- `editorDraft`: unsaved editor content.
- `statusMessage`: temporary user feedback.

Thunk actions validate state before dispatching reducer actions. This centralizes duplicate-name checks, root protection, stale-ID handling, ancestor expansion, and selected-folder fallback. Redux Toolkit uses Immer internally so reducers can use concise mutation-style syntax while maintaining immutable state updates.

## File-System Data Structure

The workspace uses a normalized item map:

```ts
type FileSystemItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  content?: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceFileSystem = {
  rootId: string;
  items: Record<string, FileSystemItem>;
};
```

Folders do not store child arrays. Children are derived by filtering items whose `parentId` matches the folder ID. Files store text in the optional `content` property.

## File-System Behavior

### Parent-child relationships

Every non-root item points to an existing folder through `parentId`. `getChildren` derives direct children. Creation and rename operations validate that the parent exists and that names are unique within that parent, using case-insensitive comparison.

### Recursive nesting

Folders can contain folders without a fixed depth limit. The sidebar recursively renders folder children. `buildPath` follows parent links upward to build breadcrumb paths.

### Recursive deletion

Deleting a folder calls `getDescendants` to collect every nested folder and file. The folder and all collected IDs are removed from the normalized map. If the selected folder or opened file is deleted, the UI falls back to the nearest surviving parent and closes the editor when necessary.

### Search implementation

`searchWorkspace` is a pure read-only function. It trims and lowercases the query, scans all non-root item names, and scans text-file contents. Results include the item, its path, a display path label, and a match reason: `name`, `content`, or `both`. Results are sorted by match type, folder/file type, and name.

### Breadcrumb navigation

Breadcrumbs are created by following `parentId` links from the current item to the root. Ancestor folders are buttons, so users can jump directly to any level. Opening a deeply nested file also expands its ancestors in the sidebar.

## Persistence

The persistence bridge loads and saves durable workspace data through browser storage:

```text
localStorage key: mini-workspace-explorer:v1
payload: { rootId, items }
```

The selected folder, open file, expanded folders, search query, and editor draft are transient and are not persisted. After refresh, workspace data is restored and the view starts at the root.

Persisted data is validated for valid item shapes, a folder root with `parentId: null`, existing folder parents, and the absence of orphaned links or parent cycles. Invalid or unavailable storage data is ignored so the starter workspace remains usable.

## Important Implementation Decisions

- A normalized map makes lookup, rename, deletion, and serialization straightforward.
- Parent IDs avoid duplicated nested object state.
- Validation occurs before reducer dispatches.
- Search is pure and deterministic, making it easy to test.
- Editor drafts are separate from saved file content.
- Client-only persistence avoids server/client markup differences.
- Stable generated IDs are preserved through rename operations.

## Edge Cases Handled

- Empty, whitespace-only, `.`, and `..` names.
- Names containing `/` or `\\` path separators.
- Case-insensitive duplicates within one folder.
- Attempts to rename or delete the root.
- Missing or stale item IDs.
- Recursive deletion and selected-folder fallback.
- Closing the editor when its file is deleted.
- Unsaved changes during navigation and browser unload.
- Empty searches and deep content searches.
- Malformed JSON, invalid items, orphaned parents, and cyclic links.
- Narrow-screen navigation without horizontal overflow.

## Screenshots

Screenshots are not included yet. Replace these placeholders before submission:

![Workspace folder view](./docs/screenshots/workspace-folder-view.png)

![Text editor view](./docs/screenshots/text-editor-view.png)

![Workspace search](./docs/screenshots/workspace-search.png)

## Deployment

### Vercel

1. Push the project to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Use `npm install` as the install command and `npm run build` as the build command.
4. Deploy using the default Next.js output settings.

No environment variables are required for the current local-storage-based implementation.

### Other Node.js hosts

```bash
npm install
npm run build
npm run start
```

Configure the host to run the Next.js process and expose its assigned port.

## Repository and Live Demo

- GitHub repository: `<GITHUB_REPOSITORY_URL>`
- Live deployed URL: `<LIVE_DEPLOYED_URL>`

## Known Limitations

- Data is stored only in the current browser's `localStorage`; it is not synchronized across devices.
- There is no authentication, collaboration, backend API, or server-side file system integration.
- Only text files are supported; binary files and uploads are out of scope.
- Deletion has no undo history after confirmation.
- Transient navigation state resets to the workspace root after refresh.
- Screenshot paths are placeholders until image assets are added.
