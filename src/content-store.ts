/**
 * Content loading for consumers: a bundle of files (built from the content trees) plus a homebrew
 * overlay. Pure: no DOM, no filesystem. Browser stores implement HomebrewStore.
 */
import { DocumentError, parseDocument, type Document } from "./document.js";
import { lintAll } from "./lint.js";
import { buildRegistry, type Diagnostic, type Registry } from "./registry.js";

export interface ContentFile { path: string; text: string; origin: "bundle" | "homebrew" }
export interface ContentBundle { built?: string; notice?: string; files: { path: string; text: string }[] }
export interface Loaded { docs: Map<string, Document>; registry: Registry; diagnostics: Diagnostic[]; files: ContentFile[]; built?: string; notice?: string }

export interface HomebrewStore {
  list(): Promise<ContentFile[]>;
  put(files: ContentFile[]): Promise<void>;
  remove(path: string): Promise<void>;
  clear(): Promise<void>;
}

export function memoryHomebrewStore(initial: ContentFile[] = []): HomebrewStore {
  const map = new Map(initial.map((f) => [f.path, { ...f, origin: "homebrew" as const }]));
  return {
    list: async () => [...map.values()],
    put: async (files) => { for (const f of files) map.set(f.path, { ...f, origin: "homebrew" }); },
    remove: async (path) => { map.delete(path); },
    clear: async () => { map.clear(); },
  };
}

/** Parse leniently, build the registry, lint. A homebrew file with a bundle file's path replaces it. */
export function loadContent(bundle: ContentBundle, homebrew: ContentFile[]): Loaded {
  const byPath = new Map<string, ContentFile>();
  for (const f of bundle.files) byPath.set(f.path, { path: f.path, text: f.text, origin: "bundle" });
  for (const f of homebrew) byPath.set(f.path, { ...f, origin: "homebrew" });
  const files = [...byPath.values()];
  const diagnostics: Diagnostic[] = [];
  const parsed: Document[] = [];
  for (const f of files) {
    try { parsed.push(parseDocument(f.text, f.path)); }
    catch (e) {
      if (e instanceof DocumentError) diagnostics.push({ path: f.path, message: e.message.replace(/^.*?: /, ""), line: e.line });
      else diagnostics.push({ path: f.path, message: String(e) });
    }
  }
  const { registry, diagnostics: regDiags } = buildRegistry(parsed);
  diagnostics.push(...regDiags, ...lintAll(parsed, registry));
  const docs = new Map<string, Document>();
  for (const d of parsed) if (typeof d.frontmatter.id === "string") docs.set(d.frontmatter.id, d);
  return { docs, registry, diagnostics, files, built: bundle.built, notice: bundle.notice };
}
