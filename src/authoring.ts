/**
 * Authoring helpers for creator tools: blank documents per content type, serialization back to
 * Markdown + frontmatter in the repository's house style, draft linting against the loaded
 * registry, and suggestion lists. Pure: no DOM, no filesystem.
 */
import YAML from "yaml";
import type { Loaded } from "./content-store.js";
import { DocumentError, parseDocument, type Document } from "./document.js";
import { lintDocument } from "./lint.js";
import { buildRegistry, type Diagnostic, type Registry } from "./registry.js";

export interface ContentType { id: string; properties: string[] }
type FM = Record<string, unknown>;

/** The content types a system suggests (from its `content-types` document), else the distinct types seen. */
export function contentTypes(docs: Map<string, Document>): ContentType[] {
  for (const d of docs.values()) {
    if (d.frontmatter.type !== "content-types" || !Array.isArray(d.frontmatter.content_types)) continue;
    return (d.frontmatter.content_types as FM[]).filter((t) => typeof t.id === "string").map((t) => ({
      id: String(t.id), properties: Array.isArray(t.properties) ? t.properties.map(String) : [],
    }));
  }
  const seen = new Set<string>();
  for (const d of docs.values()) if (typeof d.frontmatter.type === "string") seen.add(d.frontmatter.type);
  return [...seen].sort().map((id) => ({ id, properties: [] }));
}

/** The five keys plus the type's suggested properties, all empty. */
export function blankDocument(type: string, system: string, properties: string[]): { frontmatter: FM; body: string } {
  const frontmatter: FM = { id: "", type, system, name: "" };
  for (const p of properties) if (!(p in frontmatter)) frontmatter[p] = "";
  frontmatter.effects = [];
  return { frontmatter, body: "" };
}

const REQUIRED = ["id", "type", "system", "name", "effects"];
const FLOW_LISTS = ["effects", "resources", "grants", "tags", "choices"];
const isEmpty = (v: unknown): boolean => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Serialize in house style: block mapping at the top level, one-line flow mappings for effect-like rows; empty optional properties dropped. */
export function documentText(frontmatter: FM, body: string): string {
  const doc = new YAML.Document({});
  for (const [k, v] of Object.entries(frontmatter)) {
    if (!REQUIRED.includes(k) && isEmpty(v)) continue;
    const node = doc.createNode(v);
    if (FLOW_LISTS.includes(k) && YAML.isSeq(node)) for (const item of node.items) if (YAML.isMap(item)) item.flow = true;
    doc.set(k, node);
  }
  const yaml = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
  const text = body.trim() === "" ? "" : `${body.replace(/\s+$/, "")}\n`;
  return `---\n${yaml}---\n${text}`;
}

export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** `<system>.<segment>.<slug>`: the segment an existing document of that type uses, else the pluralised type. */
export function suggestedId(type: string, name: string, system: string, docs: Map<string, Document>): string {
  let segment: string | undefined;
  for (const d of docs.values()) {
    if (d.frontmatter.type !== type || typeof d.frontmatter.id !== "string") continue;
    const parts = d.frontmatter.id.split(".");
    if (parts.length >= 3 && parts[0] === system) { segment = parts.slice(1, -1).join("."); break; }
  }
  return `${system}.${segment ?? `${type}s`}.${slug(name) || "untitled"}`;
}

/** Parse and lint one draft as if it were loaded at `path` alongside everything else; only the draft's diagnostics come back. */
export function lintDraft(text: string, path: string, loaded: Loaded): { doc?: Document; diagnostics: Diagnostic[] } {
  let doc: Document;
  try { doc = parseDocument(text, path); }
  catch (e) {
    if (e instanceof DocumentError) return { diagnostics: [{ path, message: e.message.replace(/^.*?: /, ""), line: e.line }] };
    return { diagnostics: [{ path, message: String(e) }] };
  }
  const others: Document[] = [];
  for (const f of loaded.files) {
    if (f.path === path) continue;
    try { others.push(parseDocument(f.text, f.path)); } catch { /* a broken sibling is the Content view's problem */ }
  }
  const { registry, diagnostics } = buildRegistry([...others, doc]);
  const mine = diagnostics.filter((d) => d.path === path);
  return { doc, diagnostics: [...mine, ...lintDocument(doc, registry)] };
}

export function targetSuggestions(registry: Registry): { id: string; name: string; type: string }[] {
  return [...registry.variables.values()].map((v) => ({ id: v.id, name: v.name, type: v.type })).sort((a, b) => a.id.localeCompare(b.id));
}

export function momentSuggestions(registry: Registry): string[] {
  return [...registry.events.keys()];
}
