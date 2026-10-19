import type { Document } from "./document.js";

export interface Diagnostic {
  path: string;
  message: string;
  line?: number;
}

export const OPS = ["base", "add", "mul", "at_least", "at_most", "set"] as const;
/** Op names retired in the 2026-10-18 revision; the linter names their replacements. */
export const RETIRED_OPS: Record<string, string> = { min: "at_least", max: "at_most" };
export const BUILTIN_FUNCTIONS = ["floor", "ceil", "round", "abs", "max", "min", "if", "table", "dice"] as const;
/** Moments the engine fires; the only things a resource `refresh` may listen for. */
export const BUILTIN_EVENTS = [
  "catch-breath", "make-camp", "safe-rest", "encounter-start", "encounter-end", "turn-end", "level-up",
] as const;

export const DOC_ID_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
export const VAR_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
export const EVENT_ID_RE = /^[a-z][a-z0-9-]*$/;
export const ALIAS_RE = /^[A-Z][A-Z0-9_]*$/;

export interface VariableDef {
  id: string; name: string;
  type: "integer" | "dice" | "boolean" | "text" | "list";
  description?: string;
  default?: unknown; formula?: string | Lookup; alias?: string; ops?: string[];
  fold?: Record<string, string>; rounding?: "floor" | "ceil" | "round" | "none";
  declaredIn: string;
}
/** A step table: the row with the largest key <= the value of `by` wins. */
export interface Lookup { by: string; rows: Record<string, unknown> }
export const isLookup = (v: unknown): v is Lookup =>
  typeof v === "object" && v !== null && !Array.isArray(v) && ("by" in v || "rows" in v);

export interface RefreshRule { on: string; to?: string | number; add?: number }
export interface ResourceDef { id: string; max?: string | number; floor?: number; refresh: RefreshRule[]; when?: string; declaredIn: string }
export interface EventDef { id: string; description?: string; declaredIn: string }
export interface PredicateDef { id: string; name: string; args: string[]; declaredIn: string }
export interface TableDef { id: string; columns: string[]; rows: unknown[][]; declaredIn: string }
export interface SlotDef { id: string; declaredIn: string; options?: string[] }
export interface PackageDef { id: string; label?: string; members: string[] }

export interface Registry {
  variables: Map<string, VariableDef>;
  aliases: Map<string, string>;
  resources: Map<string, ResourceDef>;
  events: Map<string, EventDef>;
  predicates: Map<string, PredicateDef>;
  functions: Set<string>;
  tables: Map<string, TableDef>;
  slots: Map<string, SlotDef>;
  packages: Map<string, PackageDef>;
  documentIds: Set<string>;
  documentPaths: Map<string, string>;
  documentTypes: Map<string, string>;
}

const asArray = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];

export function buildRegistry(docs: Document[]): { registry: Registry; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const registry: Registry = {
    variables: new Map(), aliases: new Map(), resources: new Map(), events: new Map(),
    predicates: new Map(), functions: new Set(BUILTIN_FUNCTIONS), tables: new Map(),
    slots: new Map(), packages: new Map(), documentIds: new Set(), documentPaths: new Map(), documentTypes: new Map(),
  };
  for (const ev of BUILTIN_EVENTS) registry.events.set(ev, { id: ev, declaredIn: "<builtin>" });

  const dup = <T extends { declaredIn: string }>(map: Map<string, T>, kind: string, id: string, path: string): boolean => {
    const prev = map.get(id);
    if (!prev) return false;
    diagnostics.push({ path, message: `duplicate ${kind} id "${id}": declared in ${prev.declaredIn} and ${path}` });
    return true;
  };

  for (const doc of docs) {
    const fm = doc.frontmatter;
    const path = doc.path;
    const docId = typeof fm.id === "string" ? fm.id : undefined;
    if (docId) {
      const prev = registry.documentPaths.get(docId);
      if (prev) diagnostics.push({ path, message: `duplicate document id "${docId}": declared in ${prev} and ${path}` });
      registry.documentIds.add(docId);
      registry.documentPaths.set(docId, path);
      if (typeof fm.type === "string") registry.documentTypes.set(docId, fm.type);
    }

    for (const v of asArray(fm.variables)) {
      const id = String(v.id ?? "");
      if (!VAR_ID_RE.test(id)) { diagnostics.push({ path, message: `malformed variable id "${id}" (want lowercase dotted, e.g. wounds.max)` }); continue; }
      if (dup(registry.variables, "variable", id, path)) continue;
      const ops = Array.isArray(v.ops) ? v.ops.map(String) : undefined;
      for (const op of ops ?? []) if (!(OPS as readonly string[]).includes(op)) diagnostics.push({ path, message: `variable "${id}": unknown op "${op}"${RETIRED_OPS[op] ? ` (renamed: use "${RETIRED_OPS[op]}")` : ""} (allowed: ${OPS.join(", ")})` });
      const VTYPES = ["integer", "dice", "boolean", "text", "list"];
      const ROUND = ["floor", "ceil", "round", "none"];
      if (v.type !== undefined && !VTYPES.includes(String(v.type))) diagnostics.push({ path, message: `variable "${id}": unknown type "${String(v.type)}" (allowed: ${VTYPES.join(", ")})` });
      if (v.rounding !== undefined && !ROUND.includes(String(v.rounding))) diagnostics.push({ path, message: `variable "${id}": unknown rounding "${String(v.rounding)}" (allowed: ${ROUND.join(", ")})` });
      const def: VariableDef = {
        id, name: String(v.name ?? id), type: (v.type as VariableDef["type"]) ?? "integer",
        description: typeof v.description === "string" ? v.description : undefined,
        default: v.default, formula: typeof v.formula === "string" || isLookup(v.formula) ? (v.formula as string | Lookup) : undefined,
        alias: typeof v.alias === "string" ? v.alias : undefined, ops,
        fold: typeof v.fold === "object" && v.fold !== null ? (v.fold as Record<string, string>) : undefined,
        rounding: v.rounding as VariableDef["rounding"], declaredIn: path,
      };
      registry.variables.set(id, def);
      if (def.alias) {
        if (!ALIAS_RE.test(def.alias)) diagnostics.push({ path, message: `variable "${id}": malformed alias "${def.alias}" (want UPPER_CASE)` });
        else if (registry.aliases.has(def.alias)) diagnostics.push({ path, message: `duplicate alias "${def.alias}" for "${id}" (already ${registry.aliases.get(def.alias)})` });
        else registry.aliases.set(def.alias, id);
      }
    }

    for (const r of asArray(fm.resources)) {
      const id = String(r.id ?? "");
      if (!VAR_ID_RE.test(id)) { diagnostics.push({ path, message: `malformed resource id "${id}"` }); continue; }
      if (dup(registry.resources, "resource", id, path)) continue;
      registry.resources.set(id, {
        id, max: typeof r.max === "string" || typeof r.max === "number" ? r.max : undefined,
        floor: typeof r.floor === "number" ? r.floor : undefined,
        refresh: asArray(r.refresh) as unknown as RefreshRule[],
        when: typeof r.when === "string" ? r.when : undefined, declaredIn: path,
      });
    }

    switch (fm.type) {
      case "events":
        for (const e of asArray(fm.events)) {
          const id = String(e.id ?? "");
          if (!EVENT_ID_RE.test(id)) { diagnostics.push({ path, message: `malformed event id "${id}"` }); continue; }
          if (dup(registry.events, "event", id, path)) continue;
          registry.events.set(id, { id, description: typeof e.description === "string" ? e.description : undefined, declaredIn: path });
        }
        break;
      case "predicates":
        for (const p of asArray(fm.predicates)) {
          const id = String(p.id ?? "");
          if (!VAR_ID_RE.test(id)) { diagnostics.push({ path, message: `malformed predicate id "${id}"` }); continue; }
          if (dup(registry.predicates, "predicate", id, path)) continue;
          registry.predicates.set(id, { id, name: String(p.name ?? id), args: Array.isArray(p.args) ? p.args.map(String) : [], declaredIn: path });
        }
        break;
      case "functions":
        for (const f of asArray(fm.functions)) registry.functions.add(String(f.id ?? ""));
        break;
      case "table":
        if (docId) {
          if (dup(registry.tables, "table", docId, path)) break;
          registry.tables.set(docId, {
            id: docId, columns: Array.isArray(fm.columns) ? fm.columns.map(String) : [],
            rows: Array.isArray(fm.rows) ? (fm.rows as unknown[][]) : [], declaredIn: path,
          });
        }
        break;
      case "package":
        if (docId) registry.packages.set(docId, { id: docId, label: typeof fm.label === "string" ? fm.label : undefined, members: Array.isArray(fm.members) ? fm.members.map(String) : [] });
        break;
      case "class-level":
        if (docId) for (const c of asArray(fm.choices)) {
          if (typeof c.slot !== "string") continue;
          const id = `${docId}.${c.slot}`;
          if (dup(registry.slots, "slot", id, path)) continue;
          const from = typeof c.from === "object" && c.from !== null ? (c.from as Record<string, unknown>) : {};
          registry.slots.set(id, { id, declaredIn: path, options: Array.isArray(from.options) ? from.options.map(String) : undefined });
        }
        break;
    }
  }
  return { registry, diagnostics };
}
