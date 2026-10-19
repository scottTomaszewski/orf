/** Characters are documents. Stored serialized in localStorage; exportable as .md; shareable as a URL fragment. */
import YAML from "yaml";
import { parseDocument, type Document } from "../../src/document.js";

export interface StoredCharacter { id: string; name: string; summary: string; updated: string }
export interface CharacterStore { list(): StoredCharacter[]; get(id: string): Document | undefined; save(doc: Document): void; remove(id: string): void }

const PREFIX = "nimble-sheet:characters:";
const KEY_ORDER = ["id", "type", "system", "name", "stats", "ancestry", "background", "classes", "skills", "levels", "choices", "equipment", "state"];

export function serializeCharacter(doc: Document): string {
  const fm: Record<string, unknown> = {};
  for (const k of KEY_ORDER) if (k in doc.frontmatter) fm[k] = doc.frontmatter[k];
  for (const k of Object.keys(doc.frontmatter)) if (!(k in fm)) fm[k] = doc.frontmatter[k];
  const body = doc.body.replace(/\s+$/, "");
  return `---\n${YAML.stringify(fm).replace(/\n$/, "")}\n---\n${body}${body ? "\n" : ""}`;
}

export function parseCharacterText(text: string, path = "character.md", system?: string): Document {
  const doc = parseDocument(text, path);
  if (doc.frontmatter.type !== "character") throw new Error(`not a character document (type: ${String(doc.frontmatter.type ?? "none")})`);
  if (typeof doc.frontmatter.id !== "string") throw new Error("not a character document (no id)");
  const sys = typeof doc.frontmatter.system === "string" ? doc.frontmatter.system.split("@")[0] : "";
  if (system && sys !== system) throw new Error(`this character is for system "${sys}", not ${system}`);
  return doc;
}

function summarize(doc: Document, docs?: Map<string, Document>): string {
  const cls = Array.isArray(doc.frontmatter.classes) ? (doc.frontmatter.classes[0] as { id?: string; level?: number } | undefined) : undefined;
  const nameOf = (id: unknown) => { const d = typeof id === "string" ? docs?.get(id) : undefined; return d ? String(d.frontmatter.name) : typeof id === "string" ? id.split(".").pop()!.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "?"; };
  const parts = [cls ? `${nameOf(cls.id)} ${cls.level ?? 1}` : "", doc.frontmatter.ancestry ? nameOf(doc.frontmatter.ancestry) : ""].filter(Boolean);
  return parts.join(" · ");
}

export function localCharacterStore(storage: Storage, docs?: Map<string, Document>): CharacterStore {
  const keys = () => { const out: string[] = []; for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(PREFIX)) out.push(k); } return out; };
  return {
    list: () => keys().map((k) => {
      try {
        const rec = JSON.parse(storage.getItem(k) ?? "{}") as { text: string; updated: string };
        const doc = parseCharacterText(rec.text, k.slice(PREFIX.length));
        return { id: String(doc.frontmatter.id), name: String(doc.frontmatter.name), summary: summarize(doc, docs), updated: rec.updated };
      } catch { return undefined; }
    }).filter((x): x is StoredCharacter => !!x).sort((a, b) => b.updated.localeCompare(a.updated)),
    get: (id) => { const raw = storage.getItem(PREFIX + id); if (!raw) return undefined; try { return parseCharacterText((JSON.parse(raw) as { text: string }).text, `${id}.md`); } catch { return undefined; } },
    save: (doc) => storage.setItem(PREFIX + String(doc.frontmatter.id), JSON.stringify({ text: serializeCharacter(doc), updated: new Date().toISOString() })),
    remove: (id) => storage.removeItem(PREFIX + id),
  };
}

const b64 = {
  enc: (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)))),
};
export function toShareLink(doc: Document, base = typeof location !== "undefined" ? location.href.split("#")[0] : ""): string {
  return `${base}#/share/${b64.enc(serializeCharacter(doc))}`;
}
export function fromShareLink(hash: string, system?: string): Document {
  const m = /#\/share\/(.+)$/.exec(hash);
  if (!m) throw new Error("share link: missing payload");
  let text: string;
  try { text = b64.dec(m[1]); } catch { throw new Error("share link: the payload is not valid (corrupted or truncated)"); }
  try { return parseCharacterText(text, "shared.md", system); }
  catch (e) { throw new Error(`share link: ${e instanceof Error ? e.message : String(e)}`); }
}
