import { useEffect, useMemo, useState } from "react";
import { commitRepositoryChanges, loadRepository, readFileContent } from "./lib/github";
import { getAncestorPaths, getParentDirectory, normalizePath } from "./lib/tree";
import type { FileTreeNode, RepoSettings, RepoSnapshot } from "./types";

const SETTINGS_STORAGE_KEY = "todo-app.settings";

const DEFAULT_SETTINGS: RepoSettings = {
  owner: "",
  repo: "",
  branch: "",
  token: "",
};

type PaneName = "files" | "editor";

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

interface TreeItemProps {
  node: FileTreeNode;
  depth: number;
  expandedPaths: string[];
  selectedPath: string;
  onToggleDirectory: (path: string) => void;
  onSelectFile: (path: string) => void;
}

function TreeItem(props: TreeItemProps) {
  const { depth, expandedPaths, node, onSelectFile, onToggleDirectory, selectedPath } = props;

  if (node.kind === "directory") {
    const isExpanded = expandedPaths.includes(node.path);

    return (
      <li>
        <button
          className="tree-row tree-row-directory"
          style={{ paddingLeft: `${depth * 0.9 + 0.75}rem` }}
          type="button"
          onClick={() => onToggleDirectory(node.path)}
        >
          <span className="tree-symbol">{isExpanded ? "−" : "+"}</span>
          <span className="tree-label">{node.name}</span>
        </button>
        {isExpanded ? (
          <ul className="tree-list">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                node={child}
                onSelectFile={onSelectFile}
                onToggleDirectory={onToggleDirectory}
                selectedPath={selectedPath}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li>
      <button
        className={`tree-row tree-row-file${selectedPath === node.path ? " tree-row-active" : ""}`}
        style={{ paddingLeft: `${depth * 0.9 + 0.75}rem` }}
        type="button"
        onClick={() => onSelectFile(node.path)}
      >
        <span className="tree-symbol">•</span>
        <span className="tree-label">{node.name}</span>
      </button>
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
  const [targetPath, setTargetPath] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [activePane, setActivePane] = useState<PaneName>("files");
  const [status, setStatus] = useState("Complete setup to connect your private TODO repository.");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(!hasConfiguredSettings(initialSettings));

  const hasUnsavedChanges = selectedPath !== "" && fileContent !== savedContent;
  const isConfigured = hasConfiguredSettings(settings);
  const isFirstRun = !isConfigured;

  useEffect(() => {
    if (!hasConfiguredSettings(initialSettings)) {
      return;
    }

    void syncRepository(initialSettings);
  }, [initialSettings]);

  async function syncRepository(nextSettings = settings) {
    setIsBusy(true);
    setError("");
    setStatus(`Syncing ${nextSettings.owner}/${nextSettings.repo}@${nextSettings.branch}...`);

    try {
      const nextSnapshot = await loadRepository(nextSettings);
      setSnapshot(nextSnapshot);
      setExpandedPaths((current) => {
        const topLevelDirectories = nextSnapshot.tree
          .filter((node) => node.kind === "directory")
          .map((node) => node.path);

        return Array.from(new Set([...current, ...topLevelDirectories]));
      });

      if (selectedPath && !nextSnapshot.files.some((entry) => entry.path === selectedPath)) {
        setSelectedPath("");
        setTargetPath("");
        setFileContent("");
        setSavedContent("");
      }

      setStatus(`Loaded ${nextSnapshot.files.length} files from HEAD ${headLabel(nextSnapshot)}.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
      setStatus("Repository sync failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadSelectedFile(path: string) {
    if (hasUnsavedChanges && !window.confirm("Discard unsaved editor changes?")) {
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus(`Loading ${path}...`);

    try {
      const content = await readFileContent(settings, path);
      setSelectedPath(path);
      setTargetPath(path);
      setFileContent(content);
      setSavedContent(content);
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
      setTargetPath("");
      setFileContent("");
      setSavedContent("");
      return nextSnapshot;
    }

    const content = await readFileContent(settings, nextSelectedPath);
    setSelectedPath(nextSelectedPath);
    setTargetPath(nextSelectedPath);
    setFileContent(content);
    setSavedContent(content);

    return nextSnapshot;
  }

  async function publishChanges(message: string, changes: Array<{ path: string; content?: string; delete?: boolean }>, nextSelectedPath: string | null) {
    if (!snapshot) {
      setError("Sync the repository before publishing changes.");
      return;
    }

    setIsBusy(true);
    setError("");
    setStatus(`Publishing: ${message}`);

    try {
      await commitRepositoryChanges(settings, {
        baseCommitSha: snapshot.headSha,
        baseTreeSha: snapshot.treeSha,
        message,
        changes,
      });

      const nextSnapshot = await reloadSnapshotWithSelection(nextSelectedPath);
      setStatus(`Published successfully. New HEAD ${headLabel(nextSnapshot)}.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
      setStatus("Publish failed.");
    } finally {
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
    await syncRepository(nextSettings);
  }

  async function handleCreateFile() {
    const normalizedPath = normalizePath(newFilePath);

    if (!normalizedPath) {
      setError("Enter a file path for the new file.");
      return;
    }

    if (snapshot?.files.some((entry) => entry.path === normalizedPath)) {
      setError("That file already exists in the repository tree.");
      return;
    }

    await publishChanges(`Create ${normalizedPath}`, [{ path: normalizedPath, content: newFileContent }], normalizedPath);
    setNewFilePath("");
    setNewFileContent("");
    setActivePane("editor");
  }

  async function handleSaveFile() {
    if (!selectedPath) {
      setError("Select a file before saving.");
      return;
    }

    await publishChanges(`Edit ${selectedPath}`, [{ path: selectedPath, content: fileContent }], selectedPath);
  }

  async function handleMoveFile() {
    if (!selectedPath) {
      setError("Select a file before moving it.");
      return;
    }

    const normalizedPath = normalizePath(targetPath);

    if (!normalizedPath) {
      setError("Enter the destination path.");
      return;
    }

    if (normalizedPath === selectedPath) {
      await handleSaveFile();
      return;
    }

    await publishChanges(
      `Move ${selectedPath} to ${normalizedPath}`,
      [
        { path: selectedPath, delete: true },
        { path: normalizedPath, content: fileContent },
      ],
      normalizedPath,
    );
  }

  async function handleDeleteFile() {
    if (!selectedPath) {
      setError("Select a file before deleting it.");
      return;
    }

    if (!window.confirm(`Delete ${selectedPath}?`)) {
      return;
    }

    await publishChanges(`Delete ${selectedPath}`, [{ path: selectedPath, delete: true }], null);
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

  function seedNewFilePathFromSelection() {
    const parentDirectory = getParentDirectory(selectedPath || newFilePath);
    setNewFilePath(parentDirectory ? `${parentDirectory}/new-note.md` : "new-note.md");
  }

  if (isFirstRun) {
    return (
      <div className="app-shell app-shell-onboarding">
        <section className="onboarding-card">
          <div className="onboarding-copy stack-gap">
            <div>
              <p className="eyebrow">First-run setup</p>
              <h1>Connect your private TODO repository</h1>
            </div>
            <p className="hero-copy">
              Enter the repository coordinates and a fine-grained GitHub token once. After setup, the app starts on the file tree and settings remain available from the main screen.
            </p>
            <div className="onboarding-points">
              <div className="status-pill">
                <span>Primary workflow</span>
                <strong>Move notes between high-traffic folders fast</strong>
              </div>
              <div className="status-pill">
                <span>Editing model</span>
                <strong>Open, edit, move, and publish every change</strong>
              </div>
              <div className="status-pill">
                <span>Security note</span>
                <strong>Use a repo-scoped fine-grained token</strong>
              </div>
            </div>
          </div>

          <form className="settings-form onboarding-form" onSubmit={(event) => void handleSettingsSubmit(event)}>
            <label className="field-group">
              <span>Owner</span>
              <input value={settingsDraft.owner} onChange={(event) => updateDraftSetting("owner", event.target.value)} placeholder="marcingurbisz" type="text" />
            </label>
            <label className="field-group">
              <span>Repository</span>
              <input value={settingsDraft.repo} onChange={(event) => updateDraftSetting("repo", event.target.value)} placeholder="todo" type="text" />
            </label>
            <label className="field-group">
              <span>Branch</span>
              <input value={settingsDraft.branch} onChange={(event) => updateDraftSetting("branch", event.target.value)} placeholder="main" type="text" />
            </label>
            <label className="field-group">
              <span>GitHub token</span>
              <input value={settingsDraft.token} onChange={(event) => updateDraftSetting("token", event.target.value)} placeholder="Fine-grained token with contents access" type="password" />
            </label>
            <button className="primary-button" disabled={isBusy} type="submit">
              Save setup and load repository
            </button>
          </form>
        </section>

        <aside className="feedback-strip">
          <div>
            <strong>Status:</strong> {status}
          </div>
          {error ? (
            <div className="feedback-error">
              <strong>Error:</strong> {error}
            </div>
          ) : null}
        </aside>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">Android-first GitHub TODO client</p>
          <h1>todo-app</h1>
          <p className="hero-copy">
            Browse the private TODO repository, edit files, move them across folders, and publish each action as a git commit.
          </p>
        </div>
        <div className="hero-side">
          <div className="status-cluster">
            <div className="status-pill">
              <span>Repo</span>
              <strong>
                {settings.owner}/{settings.repo}
              </strong>
            </div>
            <div className="status-pill">
              <span>Branch</span>
              <strong>{settings.branch}</strong>
            </div>
            <div className="status-pill">
              <span>HEAD</span>
              <strong>{headLabel(snapshot)}</strong>
            </div>
          </div>
          <div className="hero-actions">
            <button className="secondary-button" disabled={isBusy} type="button" onClick={() => void syncRepository()}>
              Refresh
            </button>
            <button className="ghost-button" type="button" onClick={() => setShowSettings((current) => !current)}>
              {showSettings ? "Hide settings" : "Open settings"}
            </button>
          </div>
        </div>
      </header>

      <nav className="pane-tabs" aria-label="Panels">
        <button className={activePane === "files" ? "pane-tab pane-tab-active" : "pane-tab"} type="button" onClick={() => setActivePane("files")}>Files</button>
        <button className={activePane === "editor" ? "pane-tab pane-tab-active" : "pane-tab"} type="button" onClick={() => setActivePane("editor")}>Editor</button>
      </nav>

      <main className={`workspace-grid${showSettings ? " workspace-grid-with-settings" : ""}`}>
        <section className={`panel panel-files${activePane === "files" ? " panel-mobile-active" : ""}`}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Repository tree</p>
              <h2>{snapshot ? `${snapshot.files.length} files` : "No repository loaded"}</h2>
            </div>
          </div>

          <div className="panel-body">
            {snapshot ? (
              <ul className="tree-list">
                {snapshot.tree.map((node) => (
                  <TreeItem
                    key={node.path}
                    depth={0}
                    expandedPaths={expandedPaths}
                    node={node}
                    onSelectFile={(path) => void loadSelectedFile(path)}
                    onToggleDirectory={toggleDirectory}
                    selectedPath={selectedPath}
                  />
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <h3>Connect the repository</h3>
                <p>Enter a GitHub token in Settings, then load the private `todo` repository.</p>
              </div>
            )}
          </div>

          <div className="panel-footer stack-gap">
            <div className="footer-note">
              Mutations use GitHub fast-forward ref updates, so concurrent changes are rejected instead of silently overwritten.
            </div>
            <button className="ghost-button" disabled={isBusy || !settings.token} type="button" onClick={seedNewFilePathFromSelection}>
              Suggest new file path
            </button>
          </div>
        </section>

        <section className={`panel panel-editor${activePane === "editor" ? " panel-mobile-active" : ""}`}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Editor</p>
              <h2>{selectedPath || "Select a file"}</h2>
            </div>
            <div className="action-row">
              <button className="primary-button" disabled={isBusy || !selectedPath || !hasUnsavedChanges} type="button" onClick={() => void handleSaveFile()}>
                Save commit
              </button>
              <button className="danger-button" disabled={isBusy || !selectedPath} type="button" onClick={() => void handleDeleteFile()}>
                Delete
              </button>
            </div>
          </div>

          <div className="panel-body stack-gap">
            <label className="field-group">
              <span>Move or rename path</span>
              <input value={targetPath} onChange={(event) => setTargetPath(event.target.value)} placeholder="inbox/today/note.md" type="text" />
            </label>
            <button className="secondary-button" disabled={isBusy || !selectedPath} type="button" onClick={() => void handleMoveFile()}>
              Move or rename with commit
            </button>
            <label className="field-group field-group-editor">
              <span>File contents</span>
              <textarea value={fileContent} onChange={(event) => setFileContent(event.target.value)} placeholder="Select a file to edit" />
            </label>
          </div>
        </section>

        <section className={`panel panel-settings panel-settings-visible${showSettings ? " panel-mobile-active" : ""}`}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Repository settings</p>
              <h2>GitHub access</h2>
            </div>
          </div>

          <div className="panel-body stack-gap">
            <form className="settings-form" onSubmit={(event) => void handleSettingsSubmit(event)}>
              <label className="field-group">
                <span>Owner</span>
                <input value={settingsDraft.owner} onChange={(event) => updateDraftSetting("owner", event.target.value)} type="text" />
              </label>
              <label className="field-group">
                <span>Repository</span>
                <input value={settingsDraft.repo} onChange={(event) => updateDraftSetting("repo", event.target.value)} type="text" />
              </label>
              <label className="field-group">
                <span>Branch</span>
                <input value={settingsDraft.branch} onChange={(event) => updateDraftSetting("branch", event.target.value)} type="text" />
              </label>
              <label className="field-group">
                <span>GitHub token</span>
                <input value={settingsDraft.token} onChange={(event) => updateDraftSetting("token", event.target.value)} placeholder="Fine-grained token with contents access" type="password" />
              </label>
              <button className="primary-button" disabled={isBusy} type="submit">
                Save settings
              </button>
            </form>

            <div className="new-file-card stack-gap">
              <div>
                <p className="eyebrow">Quick create</p>
                <h3>New file</h3>
              </div>
              <label className="field-group">
                <span>New file path</span>
                <input value={newFilePath} onChange={(event) => setNewFilePath(event.target.value)} placeholder="today/next-step.md" type="text" />
              </label>
              <label className="field-group field-group-editor field-group-editor-small">
                <span>Initial content</span>
                <textarea value={newFileContent} onChange={(event) => setNewFileContent(event.target.value)} placeholder="Write the first note content" />
              </label>
              <button className="secondary-button" disabled={isBusy || !settings.token} type="button" onClick={() => void handleCreateFile()}>
                Create with commit
              </button>
            </div>
          </div>

          <div className="panel-footer stack-gap">
            <div className="footer-note">Use a fine-grained GitHub token limited to the private `todo` repository.</div>
            <div className="footer-note">For Play Store packaging, the token storage should move from local storage to native secure storage.</div>
          </div>
        </section>
      </main>

      <aside className="feedback-strip">
        <div>
          <strong>Status:</strong> {status}
        </div>
        {error ? (
          <div className="feedback-error">
            <strong>Error:</strong> {error}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
