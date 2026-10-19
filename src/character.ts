import type { Document } from "./document.js";
import type { Diagnostic, Registry } from "./registry.js";

export interface Attachment {
  doc: Document;
  /** How the document got here: ancestry | background | class | class-level | grant:<id> | choice:<slot> | subclass-level:<n> | equipment | feature | spell */
  via: string;
  item?: { equipped: boolean; carried: true; requirementsMet: boolean };
  /** For option picks (stat names, schools): the pick itself. */
  choice?: string;
  /** A choice's effect template with "{{ choice }}" substituted. */
  effectOverride?: Record<string, unknown>;
}

export interface Assembly {
  character: Document;
  attachments: Attachment[];
  /** class short name → level */
  classLevels: Map<string, number>;
  diagnostics: Diagnostic[];
}

type FM = Record<string, unknown>;
const isObj = (v: unknown): v is FM => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const STATS = ["str", "dex", "int", "wil"];
const TEMPLATE_TYPES = ["variables", "resources", "events", "predicates", "functions", "table", "content-types"];

export function assembleCharacter(character: Document, registry: Registry, docs: Map<string, Document>): Assembly {
  const fm = character.frontmatter;
  const diagnostics: Diagnostic[] = [];
  const attachments: Attachment[] = [];
  const seen = new Set<string>();
  const classLevels = new Map<string, number>();
  const err = (message: string) => diagnostics.push({ path: character.path, message });

  const attach = (id: unknown, via: string, extra: Partial<Attachment> = {}): Document | undefined => {
    if (typeof id !== "string") { err(`${via}: expected a document id, got ${JSON.stringify(id)}`); return undefined; }
    const doc = docs.get(id);
    if (!doc) { err(`${via}: unknown document id "${id}"`); return undefined; }
    if (seen.has(id) && !extra.choice) return doc;
    seen.add(id);
    attachments.push({ doc, via, ...extra });
    // a granted document may itself grant
    for (const g of list(doc.frontmatter.grants)) attach(g, `grant:${id}`);
    return doc;
  };

  // System template documents apply to every character of that system (the unarmored Armor base lives there).
  const pkg = typeof fm.system === "string" ? fm.system.split("@")[0] : undefined;
  for (const d of docs.values()) {
    if (TEMPLATE_TYPES.includes(String(d.frontmatter.type)) && typeof d.frontmatter.system === "string" && d.frontmatter.system.split("@")[0] === pkg) attach(d.frontmatter.id, "system");
  }

  if ("ancestry" in fm) attach(fm.ancestry, "ancestry");
  if ("background" in fm) attach(fm.background, "background");

  const choices = isObj(fm.choices) ? fm.choices : {};
  for (const entry of list(fm.classes)) {
    if (!isObj(entry)) { err(`classes: each entry must be {id, level}`); continue; }
    const cls = attach(entry.id, "class");
    if (!cls) continue;
    const level = typeof entry.level === "number" ? entry.level : 1;
    const short = typeof cls.frontmatter.short === "string" ? cls.frontmatter.short : String(entry.id).split(".").pop()!;
    classLevels.set(short, level);
    const levelDocs = [...docs.values()]
      .filter((d) => d.frontmatter.type === "class-level" && d.frontmatter.class === entry.id && typeof d.frontmatter.level === "number" && d.frontmatter.level <= level)
      .sort((a, b) => (a.frontmatter.level as number) - (b.frontmatter.level as number));
    for (const ld of levelDocs) {
      const lid = String(ld.frontmatter.id);
      attach(lid, "class-level");
      for (const c of list(ld.frontmatter.choices)) {
        if (!isObj(c) || typeof c.slot !== "string") continue;
        const slotId = `${lid}.${c.slot}`;
        const picks = list(choices[slotId]).map(String);
        const from = isObj(c.from) ? c.from : {};
        for (const pick of picks) {
          if (Array.isArray(from.options)) {
            const effectOverride = isObj(c.effect) ? substituteChoice(c.effect, pick) : undefined;
            attachments.push({ doc: ld, via: `choice:${c.slot}`, choice: pick, effectOverride });
          } else {
            const picked = attach(pick, `choice:${c.slot}`);
            if (picked && picked.frontmatter.type === "subclass" && isObj(picked.frontmatter.grants_by_level)) {
              for (const [lvl, ids] of Object.entries(picked.frontmatter.grants_by_level)) {
                if (Number(lvl) <= level) for (const g of list(ids)) attach(g, `subclass-level:${lvl}`);
              }
            }
          }
        }
      }
    }
  }

  for (const id of list(fm.features)) attach(id, "feature");
  for (const id of list(fm.spells)) attach(id, "spell");

  const stats = isObj(fm.stats) ? fm.stats : {};
  for (const e of list(fm.equipment)) {
    if (!isObj(e)) { err(`equipment: each entry must be {id, equipped}`); continue; }
    const doc = docs.get(String(e.id));
    if (!doc) { err(`equipment: unknown document id "${String(e.id)}"`); continue; }
    const req = isObj(doc.frontmatter.requires) ? doc.frontmatter.requires : {};
    let requirementsMet = true;
    for (const s of STATS) {
      const need = req[s];
      if (typeof need === "number" && (typeof stats[s] !== "number" || (stats[s] as number) < need)) {
        requirementsMet = false;
        err(`equipment ${String(e.id)}: requires ${s} ${need}, you have ${typeof stats[s] === "number" ? stats[s] : "none"}; its effects are inactive`);
      }
    }
    seen.add(String(e.id));
    attachments.push({ doc, via: "equipment", item: { equipped: e.equipped === true, carried: true, requirementsMet } });
  }

  return { character, attachments, classLevels, diagnostics };
}

function substituteChoice(effect: FM, pick: string): FM {
  const out: FM = {};
  for (const [k, v] of Object.entries(effect)) out[k] = typeof v === "string" ? v.replace(/\{\{\s*choice\s*\}\}/g, pick) : v;
  return out;
}
