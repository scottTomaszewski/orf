/** Filesystem loaders (Node only). The parser in document.ts is browser-safe. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DocumentError, parseDocument, type Document } from "./document.js";

export function listDocumentFiles(dirs: string[]): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".md") && name.toLowerCase() !== "readme.md" && !name.toUpperCase().startsWith("LICENSE")) files.push(p);
    }
  };
  for (const d of dirs) walk(d);
  files.sort();
  return files;
}

export function loadDocuments(dirs: string[]): Document[] {
  return listDocumentFiles(dirs).map((p) => parseDocument(readFileSync(p, "utf8"), p));
}

/** Like loadDocuments, but collects per-file DocumentErrors instead of throwing on the first. */
export function loadDocumentsLenient(dirs: string[]): { docs: Document[]; errors: DocumentError[] } {
  const docs: Document[] = [];
  const errors: DocumentError[] = [];
  for (const p of listDocumentFiles(dirs)) {
    try { docs.push(parseDocument(readFileSync(p, "utf8"), p)); }
    catch (e) { if (e instanceof DocumentError) errors.push(e); else throw e; }
  }
  return { docs, errors };
}
