import { useEffect, useMemo, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { marked } from "marked";
import { commitRepositoryChanges, loadRepository, readFileContent } from "./lib/github";
import { filterFileTree, getAncestorPaths, getParentDirectory, normalizePath } from "./lib/tree";
import type { CommitChange, FileTreeNode, RepoSettings, RepoSnapshot } from "./types";

const SETTINGS_STORAGE_KEY = "todo-app.settings";

const DEFAULT_SETTINGS: RepoSettings = {
  owner: "marcingurbisz",
  repo: "todo",
  branch: "main",
  token: "",
};

type PaneName = "files" | "editor";
type EditorMode = "preview" | "raw";
type ActionSheet =
  | { type: "move"; path: string }
  | { type: "move-many" }
  | { type: "directory"; path: string }
  | null;

const MOVE_SUGGESTIONS: Record<string, string[]> = {
  "__today": ["__tomorrow", "_short-term", "__now"],
  "__tomorrow": ["__today", "_short-term", "__now"],
  "__now": ["__today", "__tomorrow", "_short-term"],
  "_short-term": ["__today", "__tomorrow", "__now"],
  "review-every-weekend": ["__today", "_short-term", "__now"],
  "review-every-zmonth": ["_short-term", "__today"],
};

marked.setOptions({
  breaks: true,
  gfm: true,
});

function displayName(pathOrName: string): string {
  const name = pathOrName.split("/").at(-1) ?? pathOrName;
  return name.replace(/\.md$/i, "");
}

function badgeClassName(name: string): string {
  if (name === "__now") {
    return "folder-badge folder-badge-now";
  }

  if (name === "__today" || name === "__tomorrow") {
    return "folder-badge folder-badge-today";
  }

  if (name === "_short-term") {
    return "folder-badge folder-badge-short";
  }

  if (name.startsWith("review-")) {
    return "folder-badge folder-badge-review";
  }

  return "folder-badge folder-badge-generic";
}

function listDirectoryPaths(nodes: FileTreeNode[]): string[] {
  const directories: string[] = [];

  for (const node of nodes) {
    if (node.kind !== "directory") {
      continue;
    }

    directories.push(node.path);
    directories.push(...listDirectoryPaths(node.children));
  }

  return directories;
}

function findDirectory(nodes: FileTreeNode[], path: string): FileTreeNode | null {
  for (const node of nodes) {
    if (node.kind !== "directory") {
      continue;
    }
    if (node.path === path) {
      return node;
    }
    const nested = findDirectory(node.children, path);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function getMoveSuggestions(path: string): string[] {
  const parentDirectory = getParentDirectory(path);
  return MOVE_SUGGESTIONS[parentDirectory] ?? [];
}

function countFiles(nodes: FileTreeNode[]): number {
  return nodes.reduce((total, node) => {
    if (node.kind === "file") {
      return total + 1;
    }

    return total + countFiles(node.children);
  }, 0);
}

function immediateFileCount(node: FileTreeNode): number {
  return node.children.filter((child) => child.kind === "file").length;
}

function Icon({ name, size = 18 }: { name: "back" | "chevron" | "delete" | "file" | "folder" | "gear" | "move" | "plus" | "search" | "sync"; size?: number }) {
  const paths = {
    back: <polyline points="15 18 9 12 15 6" />,
    chevron: <polyline points="9 18 15 12 9 6" />,
    delete: <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6M10 11v6M14 11v6" /></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><polyline points="14 3 14 8 19 8" /></>,
    folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33A1.65 1.65 0 0 0 14 20.83V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3.09 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.92a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.2l.06.06a1.65 1.65 0 0 0 1.82.33H9A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9A1.65 1.65 0 0 0 20.91 10H21a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z" /></>,
    move: <path d="M5 9l-3 3 3 3M2 12h13M19 5v14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sync: <><path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4" /><path d="M12 3v13m0 0-4-4m4 4 4-4" /></>,
  };

  return <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">{paths[name]}</svg>;
}

function readStoredSettings(): RepoSettings {
  const fallback = { ...DEFAULT_SETTINGS };

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!stored) {
      return fallback;
    }

    return {
      ...fallback,
      ...(JSON.parse(stored) as Partial<RepoSettings>),
    };
  } catch {
    return fallback;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected application error.";
}

function hasConfiguredSettings(settings: RepoSettings): boolean {
  return Boolean(
    settings.owner.trim() &&
      settings.repo.trim() &&
      settings.branch.trim() &&
      settings.token.trim(),
  );
}

function headLabel(snapshot: RepoSnapshot | null): string {
  return snapshot ? snapshot.headSha.slice(0, 7) : "none";
}

function mergeExpanded(current: string[], path: string): string[] {
  return Array.from(new Set([...current, ...getAncestorPaths(path)]));
}

function repositoryPathsEqual(left: string, right: string): boolean {
  return normalizePath(left).normalize("NFC") === normalizePath(right).normalize("NFC");
}

function fileAtPath(snapshot: RepoSnapshot, path: string) {
  return snapshot.files.find((entry) => repositoryPathsEqual(entry.path, path));
}

function assertTouchedFilesAreCurrent(
  baseline: RepoSnapshot,
  latest: RepoSnapshot,
  changes: CommitChange[],
) {
  const touchedPaths = Array.from(new Set(changes.map((change) => normalizePath(change.path).normalize("NFC"))));

  for (const path of touchedPaths) {
    const baselineFile = fileAtPath(baseline, path);
    const latestFile = fileAtPath(latest, path);

    if (baselineFile?.sha !== latestFile?.sha) {
      throw new Error(`${path} changed in the remote repository. The latest tree has been loaded; reopen the file and try again.`);
    }
  }
}

interface TreeItemProps {
  disabled: boolean;
  isSelecting: boolean;
  node: FileTreeNode;
  depth: number;
  expandedPaths: string[];
  selectedPath: string;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (file: FileTreeNode) => void;
  onDirectoryMenu: (path: string) => void;
  onFileMenu: (file: FileTreeNode) => void;
  onToggleSelection: (file: FileTreeNode) => void;
  selectedFiles: FileTreeNode[];
}

function TreeItem(props: TreeItemProps) {
  const { depth, disabled, expandedPaths, isSelecting, node, onDirectoryMenu, onFileMenu, onSelectFile, onToggleDirectory, onToggleSelection, selectedFiles, selectedPath } = props;

  if (node.kind === "directory") {
    const isExpanded = expandedPaths.includes(node.path);

    return (
      <li>
        <div
          className="tree-row tree-row-directory"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <button className="tree-row-main" disabled={disabled} type="button" onClick={() => onToggleDirectory(node.path)}>
          <span className={`tree-chevron${isExpanded ? " tree-chevron-open" : ""}`}><Icon name="chevron" size={10} /></span>
          <span className="tree-icon"><Icon name="folder" size={16} /></span>
          <span className="tree-label">{node.name}</span>
          </button>
          <span className={badgeClassName(node.name)}>{node.children.length === 0 ? "empty" : node.children.length}</span>
          <button aria-label={`Actions for directory ${node.path}`} className="icon-button node-menu" disabled={disabled} type="button" onClick={() => onDirectoryMenu(node.path)}>•••</button>
        </div>
        {isExpanded ? (
          <ul className="tree-list">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                depth={depth + 1}
                disabled={disabled}
                expandedPaths={expandedPaths}
                isSelecting={isSelecting}
                node={child}
                onDirectoryMenu={onDirectoryMenu}
                onFileMenu={onFileMenu}
                onSelectFile={onSelectFile}
                onToggleDirectory={onToggleDirectory}
                onToggleSelection={onToggleSelection}
                selectedFiles={selectedFiles}
                selectedPath={selectedPath}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const isSelected = selectedFiles.some((file) => repositoryPathsEqual(file.path, node.path));

  return (
    <li>
      <div
        className={`tree-row tree-row-file${!isSelecting && repositoryPathsEqual(selectedPath, node.path) ? " tree-row-active" : ""}${isSelected ? " tree-row-selected" : ""}`}
        style={{ paddingLeft: `${26 + depth * 16}px` }}
      >
        <button className="tree-row-main" disabled={disabled} type="button" onClick={() => isSelecting ? onToggleSelection(node) : onSelectFile(node)}>
        {isSelecting ? <span aria-hidden="true" className={`selection-check${isSelected ? " selected" : ""}`}>{isSelected ? "✓" : ""}</span> : <span className="tree-icon"><Icon name="file" size={16} /></span>}
        <span className="tree-label">{displayName(node.name)}</span>
        </button>
        {!isSelecting ? <button aria-label={`Actions for file ${node.path}`} className="icon-button node-menu" disabled={disabled} type="button" onClick={() => onFileMenu(node)}>•••</button> : null}
      </div>
    </li>
  );
}

export function App() {
  const initialSettings = useMemo(() => readStoredSettings(), []);
  const [settings, setSettings] = useState<RepoSettings>(initialSettings);
  const [settingsDraft, setSettingsDraft] = useState<RepoSettings>(initialSettings);
  const [snapshot, setSnapshot] = useState<RepoSnapshot | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [activePane, setActivePane] = useState<PaneName>("files");
  const [editorMode, setEditorMode] = useState<EditorMode>("preview");
  const [status, setStatus] = useState("Complete setup to connect your private TODO repository.");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(!hasConfiguredSettings(initialSettings));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFileName, setCreateFileName] = useState("");
  const [createFileDirectory, setCreateFileDirectory] = useState("__today");
  const [createFileContent, setCreateFileContent] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [actionSheet, setActionSheet] = useState<ActionSheet>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileTreeNode[]>([]);
  const [deletePath, setDeletePath] = useState("");
  const [toast, setToast] = useState("");
  const publishInFlight = useRef(false);
  const expandedPathsInitialized = useRef(false);

  const hasUnsavedChanges = selectedPath !== "" && fileContent !== savedContent;
  const isConfigured = hasConfiguredSettings(settings);
  const isFirstRun = !isConfigured;
  const previewHtml = useMemo(() => marked.parse(fileContent || "") as string, [fileContent]);
  const directoryOptions = useMemo(() => {
    if (!snapshot) {
      return ["__today"];
    }

    return listDirectoryPaths(snapshot.tree);
  }, [snapshot]);
  const filteredTree = useMemo(() => filterFileTree(snapshot?.tree ?? [], searchQuery), [searchQuery, snapshot]);
  const visibleFileCount = useMemo(() => countFiles(filteredTree), [filteredTree]);
  const effectiveExpandedPaths = useMemo(
    () => (searchQuery.trim() ? listDirectoryPaths(filteredTree) : expandedPaths),
    [expandedPaths, filteredTree, searchQuery],
  );

  useEffect(() => {
    if (!hasConfiguredSettings(initialSettings)) {
      return;
    }

    void syncRepository(initialSettings);
  }, [initialSettings]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const registration = CapacitorApp.addListener("backButton", () => {
      if (showCreateDialog) {
        setShowCreateDialog(false);
      } else if (deletePath) {
        setDeletePath("");
      } else if (actionSheet) {
        setActionSheet(null);
      } else if (showSettings && !isFirstRun) {
        closeSettings();
      } else if (activePane === "editor") {
        setActivePane("files");
      } else if (isSelecting) {
        setIsSelecting(false);
        setSelectedFiles([]);
      } else {
        void CapacitorApp.exitApp();
      }
    });

    return () => {
      void registration.then((listener) => listener.remove());
    };
  }, [actionSheet, activePane, deletePath, isFirstRun, isSelecting, showCreateDialog, showSettings]);

  async function syncRepository(nextSettings = settings) {
    setIsBusy(true);
    setError("");
    setStatus(`Syncing ${nextSettings.owner}/${nextSettings.repo}@${nextSettings.branch}...`);

    try {
      const nextSnapshot = await loadRepository(nextSettings);
      setSnapshot(nextSnapshot);
      const directoryPaths = new Set(listDirectoryPaths(nextSnapshot.tree));
      const initializeExpandedPaths = !expandedPathsInitialized.current;
      expandedPathsInitialized.current = true;
      setExpandedPaths((current) =>
        initializeExpandedPaths
          ? directoryPaths.has("__now") ? ["__now"] : []
          : current.filter((path) => directoryPaths.has(path)),
      );

      if (selectedPath && !nextSnapshot.files.some((entry) => repositoryPathsEqual(entry.path, selectedPath))) {
        setSelectedPath("");
        setFileContent("");
        setSavedContent("");
      }

      setLastSyncAt(new Date().toLocaleString());
      setStatus(`Loaded ${nextSnapshot.files.length} files from HEAD ${headLabel(nextSnapshot)}.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
      setStatus("Repository sync failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadSelectedFile(file: FileTreeNode) {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved editor changes?")) {
      return;
    }

    const { path, sha } = file;
    setIsBusy(true);
    setError("");
    setStatus(`Loading ${path}...`);

    try {
      if (!sha) {
        throw new Error("The selected file is no longer present in the loaded repository tree. Pull the latest repository state and try again.");
      }
      const content = await readFileContent(settings, { sha });
      setSelectedPath(path);
      setFileContent(content);
      setSavedContent(content);
      setEditorMode("preview");
      setExpandedPaths((current) => mergeExpanded(current, path));
      setActivePane("editor");
      setStatus(`Opened ${path}.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
      setStatus("File open failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function reloadSnapshotWithSelection(nextSelectedPath: string | null) {
    const nextSnapshot = await loadRepository(settings);
    setSnapshot(nextSnapshot);
    setExpandedPaths((current) =>
      nextSelectedPath ? mergeExpanded(current, nextSelectedPath) : current,
    );

    if (!nextSelectedPath) {
      setSelectedPath("");
      setFileContent("");
      setSavedContent("");
      return nextSnapshot;
    }

    const file = nextSnapshot.files.find((entry) => repositoryPathsEqual(entry.path, nextSelectedPath));
    if (!file) {
      throw new Error(`The published file ${nextSelectedPath} was not found in the refreshed repository tree.`);
    }
    const content = await readFileContent(settings, file);
    setSelectedPath(nextSelectedPath);
    setFileContent(content);
    setSavedContent(content);
    setEditorMode("preview");

    return nextSnapshot;
  }

  async function publishChanges(message: string, changes: CommitChange[], nextSelectedPath: string | null): Promise<boolean> {
    if (!snapshot) {
      setError("Sync the repository before publishing changes.");
      return false;
    }

    if (publishInFlight.current) {
      return false;
    }

    publishInFlight.current = true;
    setIsBusy(true);
    setError("");
    setStatus(`Publishing: ${message}`);

    try {
      const baselineSnapshot = snapshot;
      let publishedSha = "";

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const latestSnapshot = await loadRepository(settings);
        assertTouchedFilesAreCurrent(baselineSnapshot, latestSnapshot, changes);

        try {
          publishedSha = await commitRepositoryChanges(settings, {
            baseCommitSha: latestSnapshot.headSha,
            baseTreeSha: latestSnapshot.treeSha,
            message,
            changes,
          });
          break;
        } catch (publishError) {
          const branchMoved = errorMessage(publishError).startsWith("The remote branch moved");
          if (!branchMoved || attempt === 1) {
            throw publishError;
          }
        }
      }

      if (!publishedSha) {
        throw new Error("The commit could not be published after refreshing the remote branch.");
      }

      try {
        const nextSnapshot = await reloadSnapshotWithSelection(nextSelectedPath);
        setStatus(`Published successfully. New HEAD ${headLabel(nextSnapshot)}.`);
      } catch (refreshError) {
        setError(`Commit ${publishedSha.slice(0, 7)} was published, but the app could not refresh: ${errorMessage(refreshError)} Use Pull now before the next change.`);
        setStatus(`Published successfully at ${publishedSha.slice(0, 7)}, refresh needed.`);
      }
      setToast(`${message} · published`);
      return true;
    } catch (nextError) {
      setError(errorMessage(nextError));
      setStatus("Publish failed.");
      return false;
    } finally {
      publishInFlight.current = false;
      setIsBusy(false);
    }
  }

  async function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextSettings = {
      owner: settingsDraft.owner.trim(),
      repo: settingsDraft.repo.trim(),
      branch: settingsDraft.branch.trim(),
      token: settingsDraft.token.trim(),
    };

    if (!hasConfiguredSettings(nextSettings)) {
      setError("Owner, repository, branch, and token are all required.");
      return;
    }

    setSettings(nextSettings);
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
    setShowSettings(false);
    setActivePane("files");
    expandedPathsInitialized.current = false;
    await syncRepository(nextSettings);
  }

  async function handleCreateFile() {
    const trimmedName = createFileName.trim();

    if (!trimmedName) {
      setError("Enter a file name for the new file.");
      return;
    }

    const fileName = trimmedName.includes(".") ? trimmedName : `${trimmedName}.md`;
    const normalizedPath = normalizePath(
      createFileDirectory ? `${createFileDirectory}/${fileName}` : fileName,
    );

    if (!normalizedPath) {
      setError("Enter a file path for the new file.");
      return;
    }

    if (snapshot?.files.some((entry) => repositoryPathsEqual(entry.path, normalizedPath))) {
      setError("That file already exists in the repository tree.");
      return;
    }

    const published = await publishChanges(
      `Create ${normalizedPath}`,
      [{ path: normalizedPath, content: createFileContent }],
      null,
    );

    if (!published) {
      return;
    }

    setCreateFileName("");
    setCreateFileContent("");
    setShowCreateDialog(false);
    setActivePane("files");
  }

  async function handleSaveFile() {
    if (!selectedPath) {
      setError("Select a file before saving.");
      return;
    }

    await publishChanges(`Edit ${selectedPath}`, [{ path: selectedPath, content: fileContent }], selectedPath);
  }

  async function handleMoveToDirectory(destination: string) {
    if (!selectedPath) {
      return;
    }

    const fileName = selectedPath.split("/").at(-1) ?? selectedPath;
    const nextPath = normalizePath(`${destination}/${fileName}`);
    const moved = await publishChanges(
      `Move ${selectedPath} to ${nextPath}`,
      [
        { path: selectedPath, delete: true },
        { path: nextPath, content: fileContent },
      ],
      nextPath,
    );

    if (moved) {
      setActionSheet(null);
      setActivePane("files");
    }
  }

  async function handleMoveSelectedFiles(destination: string) {
    if (!snapshot || selectedFiles.length === 0) {
      return;
    }

    const movableFiles = selectedFiles.filter(
      (file) => !repositoryPathsEqual(getParentDirectory(file.path), destination),
    );

    if (movableFiles.length === 0) {
      setError("All selected files are already in that directory.");
      return;
    }

    const plannedMoves = movableFiles.map((file) => {
      const fileName = file.path.split("/").at(-1) ?? file.path;
      return {
        file,
        nextPath: normalizePath(`${destination}/${fileName}`),
      };
    });
    const destinationKeys = plannedMoves.map(({ nextPath }) => nextPath.normalize("NFC"));

    if (new Set(destinationKeys).size !== destinationKeys.length) {
      setError("Two selected files have the same name and cannot be moved into one directory.");
      return;
    }

    const movedSourcePaths = new Set(movableFiles.map((file) => file.path.normalize("NFC")));
    const collision = plannedMoves.find(({ nextPath }) =>
      snapshot.files.some(
        (entry) =>
          repositoryPathsEqual(entry.path, nextPath) &&
          !movedSourcePaths.has(entry.path.normalize("NFC")),
      ),
    );

    if (collision) {
      setError(`${collision.nextPath} already exists. No files were moved.`);
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus(`Preparing ${movableFiles.length} files to move...`);

    let contents: string[];
    try {
      contents = await Promise.all(
        movableFiles.map((file) => {
          if (!file.sha) {
            throw new Error(`The content identity for ${file.path} is missing. Pull now and try again.`);
          }
          return readFileContent(settings, { sha: file.sha });
        }),
      );
    } catch (nextError) {
      setError(errorMessage(nextError));
      setStatus("Preparing selected files failed.");
      setIsBusy(false);
      return;
    }

    setIsBusy(false);
    const changes = plannedMoves.flatMap(({ file, nextPath }, index) => [
      { path: file.path, delete: true as const },
      { path: nextPath, content: contents[index] },
    ]);
    const moved = await publishChanges(
      `Move ${movableFiles.length} files to ${destination}`,
      changes,
      null,
    );

    if (moved) {
      setActionSheet(null);
      setIsSelecting(false);
      setSelectedFiles([]);
    }
  }

  async function openFileMoveSheet(file: FileTreeNode) {
    const { path, sha } = file;
    setIsBusy(true);
    setError("");
    try {
      if (!sha) {
        throw new Error("The selected file is no longer present in the loaded repository tree. Pull the latest repository state and try again.");
      }
      const content = await readFileContent(settings, { sha });
      setSelectedPath(path);
      setFileContent(content);
      setSavedContent(content);
      setActionSheet({ type: "move", path });
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleMoveFilesUp(directoryPath: string) {
    if (!snapshot) {
      return;
    }

    const parent = getParentDirectory(directoryPath);
    const entries = snapshot.files.filter(
      (entry) => getParentDirectory(entry.path) === directoryPath,
    );

    if (!parent || entries.length === 0) {
      return;
    }

    setIsBusy(true);
    setError("");
    try {
      const contents = await Promise.all(
        entries.map((entry) => readFileContent(settings, entry)),
      );
      const changes = entries.flatMap((entry, index) => {
        const fileName = entry.path.split("/").at(-1) ?? entry.path;
        return [
          { path: entry.path, delete: true as const },
          { path: `${parent}/${fileName}`, content: contents[index] },
        ];
      });
      setIsBusy(false);
      const moved = await publishChanges(
        `Move ${entries.length} files from ${directoryPath} to ${parent}`,
        changes,
        null,
      );
      if (moved) {
        setActionSheet(null);
      }
    } catch (nextError) {
      setError(errorMessage(nextError));
      setIsBusy(false);
    }
  }

  async function handleDeleteFile() {
    if (!selectedPath) {
      setError("Select a file before deleting it.");
      return;
    }

    await publishChanges(`Delete ${selectedPath}`, [{ path: selectedPath, delete: true }], null);
    setDeletePath("");
    setActivePane("files");
  }

  function updateDraftSetting(field: keyof RepoSettings, value: string) {
    setSettingsDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleDirectory(path: string) {
    setExpandedPaths((current) =>
      current.includes(path) ? current.filter((entry) => entry !== path) : [...current, path],
    );
  }

  function toggleFileSelection(file: FileTreeNode) {
    setSelectedFiles((current) =>
      current.some((selectedFile) => repositoryPathsEqual(selectedFile.path, file.path))
        ? current.filter((selectedFile) => !repositoryPathsEqual(selectedFile.path, file.path))
        : [...current, file],
    );
  }

  function cancelSelection() {
    setIsSelecting(false);
    setSelectedFiles([]);
    setActionSheet(null);
  }

  function openSettings() {
    setSettingsDraft(settings);
    setShowSettings(true);
  }

  function closeSettings() {
    setSettingsDraft(settings);
    setShowSettings(false);
  }

  function openCreateDialog(directory?: string) {
    const suggestedDirectory = directory || getParentDirectory(selectedPath) || directoryOptions[0] || "__today";
    setCreateFileDirectory(suggestedDirectory);
    setCreateFileName("");
    setCreateFileContent("");
    setActionSheet(null);
    setShowCreateDialog(true);
  }

  const selectedDirectory = getParentDirectory(selectedPath);
  const suggestedDestinations = getMoveSuggestions(selectedPath).filter((path) => path !== selectedDirectory);
  const otherDestinations = directoryOptions.filter(
    (path) => path !== selectedDirectory && !suggestedDestinations.includes(path),
  );
  const actionDirectory =
    actionSheet?.type === "directory" ? findDirectory(snapshot?.tree ?? [], actionSheet.path) : null;
  const actionDirectoryFileCount = actionDirectory ? immediateFileCount(actionDirectory) : 0;

  return (
    <div className="prototype-stage">
      <main className={`device${isBusy ? " busy" : ""}`}>
        {!showSettings && activePane === "files" ? (
          <header className="appbar">
            {isSelecting ? (
              <>
                <button aria-label="Cancel selection" className="icon-button" disabled={isBusy} type="button" onClick={cancelSelection}><Icon name="back" /></button>
                <h1 className="appbar-title selection-title">{selectedFiles.length} selected</h1>
                <button className="selection-move-button" disabled={isBusy || selectedFiles.length === 0} type="button" onClick={() => setActionSheet({ type: "move-many" })}><Icon name="move" size={15} />Move</button>
              </>
            ) : (
              <>
                <h1 className="appbar-title"><Icon name="sync" /><span>todo</span></h1>
                <div className="appbar-actions">
                  <span className={`sync-chip${isBusy ? " syncing" : ""}`}><span className="sync-dot" />{isBusy ? "publishing…" : "synced"}</span>
                  <button aria-label="Select files" className="selection-start-button" disabled={isBusy || !snapshot} type="button" onClick={() => setIsSelecting(true)}>Select</button>
                  <button aria-label="Search" className="icon-button" disabled={isBusy} type="button" onClick={() => setShowSearch((current) => !current)}><Icon name="search" /></button>
                  <button aria-label="Settings" className="icon-button" disabled={isBusy} type="button" onClick={openSettings}><Icon name="gear" /></button>
                </div>
              </>
            )}
          </header>
        ) : null}

        <section className="screen">
          {showSettings ? (
            <form className="settings-screen" aria-label="Settings" onSubmit={(event) => void handleSettingsSubmit(event)}>
              <div className="settings-head">
                {!isFirstRun ? <button aria-label="Back" className="icon-button" type="button" onClick={closeSettings}><Icon name="back" /></button> : null}
                <h1>Settings</h1>
              </div>
              <div className="settings-area">
                {isFirstRun ? <p className="settings-intro">Connect your private GitHub TODO repository.</p> : null}
                <label className="setting-group"><span className="setting-label">Owner</span><input className="setting-input" value={settingsDraft.owner} onChange={(event) => updateDraftSetting("owner", event.target.value)} placeholder="marcingurbisz" type="text" /></label>
                <label className="setting-group"><span className="setting-label">Repository</span><input className="setting-input" value={settingsDraft.repo} onChange={(event) => updateDraftSetting("repo", event.target.value)} placeholder="todo" type="text" /></label>
                <label className="setting-group"><span className="setting-label">Branch</span><input className="setting-input" value={settingsDraft.branch} onChange={(event) => updateDraftSetting("branch", event.target.value)} placeholder="main" type="text" /></label>
                <label className="setting-group"><span className="setting-label">GitHub token</span><input className="setting-input" value={settingsDraft.token} onChange={(event) => updateDraftSetting("token", event.target.value)} placeholder="Fine-grained token" type="password" /></label>
                <p className="setting-hint">Fine-grained PAT with contents read/write access to this repository only.</p>
                <div className="setting-group">
                  <span className="setting-label">Sync</span>
                  <div className="settings-inline-actions">
                    <button className="action-button" disabled={isBusy || isFirstRun} type="button" onClick={() => void syncRepository()}>Pull now</button>
                  </div>
                  <p className="setting-hint">Last pull: {lastSyncAt ?? "not synced in this session"}{snapshot ? ` · ${snapshot.files.length} files` : ""}</p>
                </div>
              </div>
              <div className="action-bar">
                {!isFirstRun ? <button className="action-button" type="button" onClick={closeSettings}>Cancel</button> : null}
                <button aria-label={isFirstRun ? "Save setup and load repository" : "Save settings"} className="action-button primary" disabled={isBusy} type="submit">Save</button>
              </div>
            </form>
          ) : activePane === "editor" ? (
            <section className="editor-screen">
              <div className="editor-tools">
                <button aria-label="Back" className="icon-button" type="button" onClick={() => setActivePane("files")}><Icon name="back" /></button>
                <div className="editor-title">
                  <h1>{displayName(selectedPath)}</h1>
                  <div>{selectedDirectory || "/"}/</div>
                  <h2 className="sr-only">{selectedPath || "Select a file"}</h2>
                </div>
                <div className="mode-toggle" aria-label="Editor mode">
                  <button className={editorMode === "preview" ? "mode-button active" : "mode-button"} type="button" onClick={() => setEditorMode("preview")}>Preview</button>
                  <button className={editorMode === "raw" ? "mode-button active" : "mode-button"} type="button" onClick={() => setEditorMode("raw")}>Raw</button>
                </div>
              </div>
              <div className="editor-area">
                {editorMode === "preview" ? (
                  <button aria-label="Markdown preview" className="markdown-preview" type="button" onClick={() => setEditorMode("raw")}>
                    <div className="markdown-preview-rendered" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    <div className="markdown-preview-hint">Tap preview to edit in raw mode</div>
                  </button>
                ) : (
                  <label className="raw-editor"><span className="sr-only">File contents</span><textarea value={fileContent} onChange={(event) => setFileContent(event.target.value)} /></label>
                )}
              </div>
              <div className="action-bar">
                <button className="action-button" disabled={isBusy || !selectedPath} type="button" onClick={() => setActionSheet({ type: "move", path: selectedPath })}><Icon name="move" size={13} />Move</button>
                <button className="action-button danger" disabled={isBusy || !selectedPath} type="button" onClick={() => setDeletePath(selectedPath)}><Icon name="delete" size={13} />Delete</button>
                <button aria-label="Save commit" className="action-button primary" disabled={isBusy || !selectedPath} type="button" onClick={() => void handleSaveFile()}>Save</button>
              </div>
            </section>
          ) : (
            <section className="tree-screen">
              <h2 className="sr-only">{snapshot ? `${visibleFileCount} files` : "No repository loaded"}</h2>
              {showSearch ? <label className="search-bar"><Icon name="search" size={16} /><span className="sr-only">Search paths</span><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search paths…" type="search" /></label> : null}
              <div className="tree-scroll">
                {snapshot ? (
                  <ul className="tree-list">
                    {filteredTree.map((node) => <TreeItem key={node.path} depth={0} disabled={isBusy} expandedPaths={effectiveExpandedPaths} isSelecting={isSelecting} node={node} onDirectoryMenu={(path) => setActionSheet({ type: "directory", path })} onFileMenu={(file) => void openFileMoveSheet(file)} onSelectFile={(file) => void loadSelectedFile(file)} onToggleDirectory={toggleDirectory} onToggleSelection={toggleFileSelection} selectedFiles={selectedFiles} selectedPath={selectedPath} />)}
                  </ul>
                ) : <div className="empty-state">Pulling repository…</div>}
                {snapshot && filteredTree.length === 0 ? <div className="empty-state">No matching files</div> : null}
              </div>
              {!isSelecting ? <button aria-label="Create file" className="floating-create-button" disabled={isBusy} type="button" onClick={() => openCreateDialog()}><Icon name="plus" size={22} /></button> : null}
            </section>
          )}
        </section>

        {actionSheet?.type === "move" ? (
          <div className="sheet-backdrop" role="presentation" onClick={() => setActionSheet(null)}>
            <section aria-label="Move file" className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" />
              <h2>Move {displayName(actionSheet.path)}</h2>
              <p>from <code>{getParentDirectory(actionSheet.path)}/</code></p>
              {suggestedDestinations.length > 0 ? <><div className="sheet-section">Suggested</div>{suggestedDestinations.map((path) => <button className="sheet-row suggested" disabled={isBusy} key={path} type="button" onClick={() => void handleMoveToDirectory(path)}><Icon name="folder" size={16} /><span>{path}/</span><small>suggested</small></button>)}<div className="sheet-section">All directories</div></> : null}
              {otherDestinations.map((path) => <button className="sheet-row" disabled={isBusy} key={path} type="button" onClick={() => void handleMoveToDirectory(path)}><Icon name="folder" size={16} /><span>{path}/</span></button>)}
            </section>
          </div>
        ) : null}

        {actionSheet?.type === "move-many" ? (
          <div className="sheet-backdrop" role="presentation" onClick={() => setActionSheet(null)}>
            <section aria-label="Move selected files" className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" />
              <h2>Move {selectedFiles.length} selected files</h2>
              <p>Choose one destination. The move is published as a single commit.</p>
              {directoryOptions.map((path) => <button className="sheet-row" disabled={isBusy} key={path} type="button" onClick={() => void handleMoveSelectedFiles(path)}><Icon name="folder" size={16} /><span>{path}/</span></button>)}
            </section>
          </div>
        ) : null}

        {actionSheet?.type === "directory" ? (
          <div className="sheet-backdrop" role="presentation" onClick={() => setActionSheet(null)}>
            <section aria-label="Directory actions" className="bottom-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" /><h2>{actionSheet.path.split("/").at(-1)}/</h2><p><code>{actionSheet.path}/</code></p>
              <button className="sheet-row" disabled={isBusy} type="button" onClick={() => openCreateDialog(actionSheet.path)}><Icon name="file" size={16} /><span>New file here</span></button>
              {getParentDirectory(actionSheet.path) && actionDirectoryFileCount > 0 ? <button className="sheet-row" disabled={isBusy} type="button" onClick={() => void handleMoveFilesUp(actionSheet.path)}><Icon name="move" size={16} /><span>Move all {actionDirectoryFileCount} files up to <code>{getParentDirectory(actionSheet.path)}/</code></span></button> : null}
            </section>
          </div>
        ) : null}

        {showCreateDialog ? (
          <div className="dialog-backdrop" role="presentation" onClick={() => setShowCreateDialog(false)}>
            <section aria-label="Create file dialog" className="dialog" onClick={(event) => event.stopPropagation()}>
              <h2>New file</h2><p>Create a new markdown file in the selected directory. It publishes immediately.</p>
              <label><span>File name</span><input autoFocus value={createFileName} onChange={(event) => setCreateFileName(event.target.value)} placeholder="new-note" type="text" /></label>
              <label><span>Directory</span><select value={createFileDirectory} onChange={(event) => setCreateFileDirectory(event.target.value)}>{directoryOptions.map((path) => <option key={path} value={path}>{path}/</option>)}</select></label>
              <div className="dialog-actions"><button className="dialog-button" type="button" onClick={() => setShowCreateDialog(false)}>Cancel</button><button aria-label="Create with commit" className="dialog-button primary" disabled={isBusy} type="button" onClick={() => void handleCreateFile()}>Create</button></div>
            </section>
          </div>
        ) : null}

        {deletePath ? (
          <div className="dialog-backdrop" role="presentation" onClick={() => setDeletePath("")}>
            <section aria-label="Delete file dialog" className="dialog" onClick={(event) => event.stopPropagation()}>
              <h2>Delete {displayName(deletePath)}?</h2><p>Removes the file from the repo. The delete commit is published immediately.</p>
              <div className="dialog-actions"><button className="dialog-button" type="button" onClick={() => setDeletePath("")}>Cancel</button><button className="dialog-button danger" disabled={isBusy} type="button" onClick={() => void handleDeleteFile()}>Delete</button></div>
            </section>
          </div>
        ) : null}

        <div aria-live="polite" className="sr-only">{status}</div>
        {toast ? <div className="toast">{toast}</div> : null}
        {error ? <button className="toast error-toast" type="button" onClick={() => setError("")}>{error}</button> : null}
      </main>
      <p className="prototype-caption">Tap <code>•••</code> on a directory for <em>new file here</em> or <em>move all up</em>. The <code>+</code> button creates a markdown file.</p>
    </div>
  );
}
