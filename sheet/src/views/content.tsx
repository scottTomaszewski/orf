import { useSignal } from "@preact/signals";
import { useContext, useEffect } from "preact/hooks";
import type { ContentFile } from "../../../src/content-store.js";
import { AppContext } from "../app-context.js";
import { Panel, CrestRule } from "../components/panel.js";

/** Read .md files from a <input type=file> selection (webkitdirectory or multiple). */
export async function readDroppedFiles(files: FileList | File[]): Promise<ContentFile[]> {
  const out: ContentFile[] = [];
  for (const f of Array.from(files)) {
    if (!f.name.endsWith(".md")) continue;
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    out.push({ path: `homebrew/${rel}`, text: await f.text(), origin: "homebrew" });
  }
  return out;
}

/** Read every .md under a directory handle (File System Access API), recursively. */
async function readDirectory(dir: FileSystemDirectoryHandle, prefix = ""): Promise<ContentFile[]> {
  const out: ContentFile[] = [];
  for await (const [name, handle] of (dir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
    if (handle.kind === "directory") out.push(...await readDirectory(handle as FileSystemDirectoryHandle, `${prefix}${name}/`));
    else if (name.endsWith(".md")) out.push({ path: `homebrew/${prefix}${name}`, text: await (await (handle as FileSystemFileHandle).getFile()).text(), origin: "homebrew" });
  }
  return out;
}

let folderHandle: FileSystemDirectoryHandle | undefined;   // kept for Reload within this session

export function ContentView() {
  const { content, homebrew, reload } = useContext(AppContext);
  const files = useSignal<ContentFile[]>([]);
  const busy = useSignal(false);
  const refreshList = async () => { files.value = await homebrew.list(); };
  useEffect(() => { void refreshList(); }, [content.value]);
  const loaded = content.value;
  const canPickFolder = typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
  const importFiles = async (list: ContentFile[]) => { busy.value = true; try { await homebrew.put(list); await reload(); await refreshList(); } finally { busy.value = false; } };
  const pickFolder = async () => {
    try { folderHandle = await (window as unknown as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker(); }
    catch { return; }   // cancelled
    await importFiles(await readDirectory(folderHandle));
  };
  const note = useSignal<string | undefined>(undefined);
  const reloadFolder = async () => {
    if (folderHandle) { await importFiles(await readDirectory(folderHandle)); note.value = undefined; }
    else { await reload(); note.value = "Reload re-reads the copies stored in this browser. To pick up edits to your files, Choose folder again (Chromium) or add the files again."; }
    await refreshList();
  };
  const onFiles = (e: Event) => { const input = e.target as HTMLInputElement; const fl = input.files; if (fl) void readDroppedFiles(fl).then(importFiles).then(() => { input.value = ""; }); };
  const remove = async (path: string) => { await homebrew.remove(path); await reload(); await refreshList(); };
  const problems = loaded?.diagnostics ?? [];
  return (
    <div class="stack">
      <h1 class="steel-h1">Content</h1>
      <Panel title="Bundle">
        <p class="small">{loaded ? `${loaded.files.filter((f) => f.origin === "bundle").length} bundled documents` : "loading…"}{loaded?.built && <span class="muted"> · built {loaded.built.slice(0, 10)}</span>}</p>
      </Panel>
      <Panel title="Homebrew" right={<span class="row">
        <a class="steel-btn steel-btn--primary" style="display:inline-flex;align-items:center;text-decoration:none" href="#/write">New document</a>
        {canPickFolder && <button type="button" class="steel-btn" disabled={busy.value} onClick={() => void pickFolder()}>Choose folder</button>}
        <label class="steel-btn">Add files<input type="file" multiple accept=".md" style="display:none" onChange={onFiles} /></label>
        <label class="steel-btn">Add folder<input type="file" multiple {...({ webkitdirectory: "" } as Record<string, string>)} style="display:none" onChange={onFiles} /></label>
        <button type="button" class="steel-btn" disabled={busy.value} onClick={() => void reloadFolder()}>Reload</button>
      </span>}>
        <p class="small muted">Your own documents (an ancestry, a background, an item): write one here, or drop `.md` files from a folder. They overlay the bundle and show up everywhere with provenance. Edit and Save, or edit the file and Reload, to see the change ripple.</p>
        {note.value && <p class="small" role="status">{note.value}</p>}
        {files.value.length === 0 ? <p class="small muted">No homebrew files.</p> : (
          <ul class="plain">{files.value.map((f) => <li key={f.path} class="row" style="justify-content:space-between"><span class="steel-mono small">{f.path}</span><span class="row"><a class="steel-btn small" style="display:inline-flex;align-items:center;text-decoration:none" aria-label={`edit ${f.path}`} href={`#/write/${encodeURIComponent(f.path)}`}>edit</a><button type="button" class="steel-btn small" aria-label={`remove ${f.path}`} onClick={() => void remove(f.path)}>remove</button></span></li>)}</ul>
        )}
      </Panel>
      <CrestRule />
      <section class={`steel-panel${problems.length ? " problems" : ""}`} aria-label="Problems"><div class="steel-panel__title"><span class="steel-label">problems</span></div>
        {problems.length === 0 ? <p class="small muted">None. Every document parsed and linted clean.</p> : (
          <ul class="small">{problems.map((d, i) => <li key={i} class={d.severity === "warning" ? "muted" : ""}><span class="steel-mono">{d.path}{d.line ? `:${d.line}` : ""}</span> {d.message}</li>)}</ul>
        )}
      </section>
    </div>
  );
}
