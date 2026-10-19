import { assembleCharacter, type Attachment } from "./character.js";
import type { Document } from "./document.js";
import { extractInlineExpressions } from "./expr-refs.js";
import { evaluate, EvalError, type Env } from "./expr/evaluate.js";
import { parse, ParseError } from "./expr/parser.js";
import { bool, formatValue, int, text, ValueError, type Value } from "./expr/value.js";
import { fold, type Contribution, type Op, type Provenance } from "./fold.js";
import { isLookup, OPS, type Diagnostic, type Lookup, type Registry, type VariableDef } from "./registry.js";

export interface SheetVariable { id: string; name: string; description?: string; value: Value; provenance: Provenance }
export interface SheetResource { id: string; max: number | undefined; /** set when the max is a dice expression the consumer rolls */ maxDice?: string; current: number; floor: number }
export interface Sheet {
  variables: Map<string, SheetVariable>;
  resources: Map<string, SheetResource>;
  attachments: Attachment[];
  classLevels: Map<string, number>;
  registry: Registry;
  diagnostics: Diagnostic[];
  value(id: string): Value;
  render(text: string): string;
}

type FM = Record<string, unknown>;
const isObj = (v: unknown): v is FM => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const STATS = ["str", "dex", "int", "wil"];
const ITEM_TYPES = ["item", "armor", "weapon"];

/** Where an expression is being evaluated: which attached document, which pick. */
interface Ctx { attachment?: Attachment }

class CycleError extends Error { constructor(public members: string[]) { super("cycle"); } }

export function evaluateCharacter(character: Document, registry: Registry, docs: Map<string, Document>): Sheet {
  const fm = character.frontmatter;
  const assembly = assembleCharacter(character, registry, docs);
  const diagnostics: Diagnostic[] = [...assembly.diagnostics];
  const seenMsg = new Set<string>(diagnostics.map((d) => d.message));
  const diag = (message: string, path = character.path, severity?: "warning") => { if (!seenMsg.has(message)) { seenMsg.add(message); diagnostics.push(severity ? { path, message, severity } : { path, message }); } };
  const state: FM = isObj(fm.state) ? fm.state : {};
  const stats: FM = isObj(fm.stats) ? fm.stats : {};

  const canon = (id: string): string | undefined => (registry.variables.has(id) ? id : registry.aliases.get(id));

  // ---- index raw effects by canonical target ----
  interface RawEffect { attachment: Attachment; effect: FM }
  const effectsByTarget = new Map<string, RawEffect[]>();
  for (const a of assembly.attachments) {
    const effects = a.effectOverride ? [a.effectOverride] : list(a.doc.frontmatter.effects).filter(isObj);
    for (const effect of effects) {
      if (typeof effect.target !== "string") continue;
      const t = canon(effect.target);
      if (!t) { diag(`${String(a.doc.frontmatter.id)}: unknown target "${effect.target}"`, a.doc.path); continue; }
      const arr = effectsByTarget.get(t) ?? [];
      arr.push({ attachment: a, effect });
      effectsByTarget.set(t, arr);
    }
  }

  // ---- lazy variable resolution with cycle detection ----
  const memo = new Map<string, SheetVariable>();
  const stack: string[] = [];
  const resourceMemo = new Map<string, SheetResource | null>();

  const toValue = (raw: unknown, ctx: Ctx, label: string, rounding?: VariableDef["rounding"]): Value | undefined => {
    if (typeof raw === "number") return int(raw);
    if (typeof raw === "boolean") return bool(raw);
    if (typeof raw === "string") return evalText(raw, ctx, label, rounding);
    if (isLookup(raw)) return evalLookup(raw, ctx, label, rounding);
    diag(`${label}: unsupported value ${JSON.stringify(raw)}`);
    return undefined;
  };

  const evalLookup = (lk: Lookup, ctx: Ctx, label: string, rounding?: VariableDef["rounding"]): Value | undefined => {
    const by = evalText(String(lk.by), ctx, `${label} by`, rounding);
    if (!by || by.kind !== "int") { if (by) diag(`${label}: lookup "by" must be an integer`); return undefined; }
    const keys = Object.keys(lk.rows ?? {}).map(Number).filter((k) => Number.isInteger(k) && k <= by.value);
    if (keys.length === 0) return undefined;
    const k = Math.max(...keys);
    return toValue((lk.rows as FM)[String(k)], ctx, `${label} rows[${k}]`, rounding);
  };

  const evalText = (src: string, ctx: Ctx, label: string, rounding?: VariableDef["rounding"]): Value | undefined => {
    try {
      return evaluate(parse(src), makeEnv(ctx, rounding));
    } catch (e) {
      if (e instanceof CycleError) throw e;
      if (e instanceof EvalError || e instanceof ParseError || e instanceof ValueError) { diag(`${label} "${src}": ${e.message}`, ctx.attachment?.doc.path ?? character.path); return undefined; }
      throw e;
    }
  };

  const makeEnv = (ctx: Ctx, rounding?: VariableDef["rounding"]): Env => ({
    rounding,
    predicates: new Set(registry.predicates.keys()),
    lookup: (name) => lookupName(name, ctx),
    call: (name, args) => callName(name, args, ctx),
  });

  const lookupName = (name: string, ctx: Ctx): Value | undefined => {
    const a = ctx.attachment;
    if (name === "choice" && a?.choice !== undefined) return text(a.choice);
    if (name === "equipped" || name === "carried") {
      if (a?.item) return bool(name === "equipped" ? a.item.equipped : a.item.carried);
      if (a && ITEM_TYPES.includes(String(a.doc.frontmatter.type))) return bool(false);
      return undefined;
    }
    if (name.startsWith("this.")) {
      const v = a?.doc.frontmatter[name.slice(5)];
      if (typeof v === "number") return int(v);
      if (typeof v === "boolean") return bool(v);
      if (typeof v === "string") return text(v);
      return undefined;
    }
    const id = canon(name);
    if (id) return resolve(id).value;
    if (name.endsWith(".current")) {
      const rid = name.slice(0, -".current".length);
      const r = resource(rid);
      if (r === null || r === undefined) {
        if (registry.resources.has(rid)) throw new EvalError(`${name}: the resource "${rid}" is not present on this character`, 0);
        return undefined;
      }
      return int(r.current);
    }
    return undefined;
  };

  const classDocs = assembly.attachments.filter((a) => a.via === "class").map((a) => a.doc);
  const equipped = assembly.attachments.filter((a) => a.item?.equipped);
  const attachedIds = new Set(assembly.attachments.map((a) => String(a.doc.frontmatter.id)));
  const callName = (name: string, args: Value[], _ctx: Ctx): Value | undefined => {
    const arg = (i: number) => (args[i] && (args[i].kind === "text") ? (args[i] as { value: string }).value : undefined);
    switch (name) {
      case "equipped": {
        const kind = arg(0) ?? "";
        return bool(equipped.some((a) => [a.doc.frontmatter.type, a.doc.frontmatter.category, a.doc.frontmatter.kind].map(String).includes(kind)));
      }
      case "has": return bool(attachedIds.has(arg(0) ?? ""));
      case "level": return int(assembly.classLevels.get(arg(0) ?? "") ?? 0);
      case "proficient": {
        const kind = (arg(0) ?? "").toLowerCase();
        return bool(classDocs.some((c) => {
          const txt = `${String(c.frontmatter.armor_proficiency ?? "")} ${String(c.frontmatter.weapon_proficiency ?? "")}`.toLowerCase();
          return txt.includes("all") || txt.includes(kind) || (kind === "armor" && txt.trim() !== "none");
        }));
      }
      case "knows": {
        const school = arg(0) ?? "";
        return bool(assembly.attachments.some((a) => a.doc.frontmatter.type === "spell-school" && String(a.doc.frontmatter.id).endsWith(`.${school}`)));
      }
      case "table": {
        const t = registry.tables.get(arg(0) ?? "");
        if (!t) throw new EvalError(`unknown table "${arg(0)}"`, 0);
        const col = t.columns.indexOf(arg(2) ?? "");
        if (col === -1) throw new EvalError(`unknown column "${arg(2)}" in table ${t.id}`, 0);
        const key = args[1];
        const row = t.rows.find((r) => (r as unknown[])[0] === (key.kind === "int" || key.kind === "text" ? key.value : undefined));
        if (!row) throw new EvalError(`no row ${formatValue(key)} in table ${t.id}`, 0);
        const cell = (row as unknown[])[col];
        return typeof cell === "number" ? int(cell) : text(String(cell));
      }
    }
    return undefined;
  };

  /** Stat requirements of an equipped item, checked against the folded stats (a cycle through the stat is reported as a cycle). */
  const requirementsMet = new Map<Attachment, boolean>();
  const meetsRequirements = (a: Attachment): boolean => {
    if (!a.item?.equipped) return true;
    const hit = requirementsMet.get(a);
    if (hit !== undefined) return hit;
    const req = isObj(a.doc.frontmatter.requires) ? a.doc.frontmatter.requires : {};
    let ok = true;
    for (const s of STATS) {
      const need = req[s];
      if (typeof need !== "number") continue;
      const have = resolve(s).value;
      if (have.kind !== "int" || have.value < need) {
        ok = false;
        diag(`equipment ${String(a.doc.frontmatter.id)}: requires ${s} ${need}, you have ${have.kind === "int" ? have.value : "?"}; its effects are inactive`, character.path, "warning");
      }
    }
    requirementsMet.set(a, ok);
    return ok;
  };

  const typeOk = (def: VariableDef, v: Value): boolean => {
    switch (def.type) {
      case "integer": return v.kind === "int";
      case "dice": return v.kind === "int" || v.kind === "dice";
      case "boolean": return v.kind === "bool";
      case "text": return v.kind === "text";
      case "list": return true;
    }
  };

  const resolve = (id: string): SheetVariable => {
    const hit = memo.get(id);
    if (hit) return hit;
    const def = registry.variables.get(id)!;
    const at = stack.indexOf(id);
    if (at !== -1) throw new CycleError(stack.slice(at));
    stack.push(id);
    try {
      const sv = compute(def);
      memo.set(id, sv);
      return sv;
    } catch (e) {
      if (e instanceof CycleError) {
        if (e.members[0] === id) {
          diag(`cycle: ${[...e.members, id].join(" → ")}; using defaults for ${e.members.join(", ")}`);
          for (const m of e.members) {
            const d = registry.variables.get(m)!;
            memo.set(m, { id: m, name: d.name, description: d.description, value: fold(d, []).value, provenance: { contributions: [], shadowed: [], dropped: [], usedDefault: true } });
          }
          return memo.get(id)!;
        }
        throw e;
      }
      throw e;
    } finally {
      stack.pop();
    }
  };

  const compute = (def: VariableDef): SheetVariable => {
    const contribs: Contribution[] = [];
    // character inputs
    if (STATS.includes(def.id) && typeof stats[def.id] === "number") contribs.push({ op: "base", value: int(stats[def.id] as number), source: "creation", origin: "creation" });
    if (def.id === "level") {
      const lv = Math.max(0, ...assembly.classLevels.values());
      if (lv > 0) contribs.push({ op: "base", value: int(lv), source: "classes", origin: "classes" });
    }
    if (def.id === "hp.max") for (const l of list(fm.levels)) if (isObj(l) && typeof l.hp === "number") contribs.push({ op: "add", value: int(l.hp), source: `level-${String(l.level)}`, origin: "levels" });
    if (def.id.startsWith("skill.") && def.id.endsWith(".points") && isObj(fm.skills)) {
      const k = def.id.slice("skill.".length, -".points".length);
      if (typeof fm.skills[k] === "number") contribs.push({ op: "add", value: int(fm.skills[k] as number), source: "skills", origin: "skills" });
    }
    if (def.type === "boolean" && typeof state[def.id] === "boolean") contribs.push({ op: "set", value: bool(state[def.id] as boolean), source: "state", origin: "state" });
    // formula
    if (def.formula !== undefined) {
      const v = toValue(def.formula, {}, `${def.id} formula`, def.rounding);
      if (v && !typeOk(def, v)) diag(`${def.id} formula: ${def.id} is ${def.type}, got ${v.kind}`, def.declaredIn);
      else if (v) contribs.push({ op: def.type === "boolean" ? "set" : "base", value: v, source: "<formula>", origin: "<formula>", path: def.declaredIn });
    }
    // effects
    for (const { attachment, effect } of effectsByTarget.get(def.id) ?? []) {
      const origin = String(attachment.doc.frontmatter.id);
      if (!meetsRequirements(attachment)) continue;
      const ctx: Ctx = { attachment };
      if (typeof effect.when === "string") {
        const w = evalText(effect.when, ctx, `${origin} when`);
        if (!w) continue;
        if (w.kind !== "bool") { diag(`${origin} when "${effect.when}": not a boolean`); continue; }
        if (!w.value) continue;
      }
      const op = (OPS as readonly string[]).find((o) => o in effect) as Op | undefined;
      if (!op) continue;
      const v = toValue(effect[op], ctx, `${origin} ${op}`, def.rounding);
      if (!v) continue;
      if (!typeOk(def, v)) { diag(`${origin} ${op}: ${def.id} is ${def.type}, got ${v.kind === "int" ? "integer" : v.kind}`, attachment.doc.path); continue; }
      contribs.push({ op, value: v, source: typeof effect.source === "string" ? effect.source : origin, origin, path: attachment.doc.path, note: typeof effect.note === "string" ? effect.note : undefined, whenText: typeof effect.when === "string" ? effect.when : undefined });
    }
    const r = fold(def, contribs);
    for (const d of r.diagnostics) diag(d.message, d.path, d.severity === "warning" ? "warning" : undefined);
    return { id: def.id, name: def.name, description: def.description, value: r.value, provenance: r.provenance };
  };

  const resource = (id: string): SheetResource | null | undefined => {
    if (resourceMemo.has(id)) return resourceMemo.get(id);
    const def = registry.resources.get(id);
    if (!def) return undefined;
    resourceMemo.set(id, null); // guard re-entry while computing `when`/`max`
    let present = true;
    if (def.when) {
      const w = evalText(def.when, {}, `resource ${id} when`);
      present = !!w && w.kind === "bool" && w.value;
    }
    if (!present) { resourceMemo.set(id, null); return null; }
    let max: number | undefined;
    let maxDice: string | undefined;
    if (typeof def.max === "number") max = def.max;
    else if (typeof def.max === "string") {
      const v = evalText(def.max, {}, `resource ${id} max`);
      if (v && v.kind === "int") max = v.value;
      else if (v && v.kind === "dice") maxDice = formatValue(v);   // the consumer rolls it
      else if (v) diag(`resource ${id} max "${def.max}": not a number or dice`);
    }
    const floor = def.floor ?? 0;
    const start = def.start === undefined || def.start === "max" ? (max ?? 0) : def.start;
    let current = typeof state[id] === "number" ? (state[id] as number) : start;
    if (max !== undefined) current = Math.min(current, max);
    current = Math.max(current, floor);
    const r: SheetResource = maxDice ? { id, max, maxDice, current, floor } : { id, max, current, floor };
    resourceMemo.set(id, r);
    return r;
  };

  // ---- compute everything declared on an attached document (template docs attach implicitly) ----
  const attachedPaths = new Set(assembly.attachments.map((a) => a.doc.path));
  const variables = new Map<string, SheetVariable>();
  for (const [id, def] of registry.variables) {
    if (!attachedPaths.has(def.declaredIn)) continue;
    try { variables.set(id, resolve(id)); } catch (e) { if (!(e instanceof CycleError)) throw e; }
  }
  const resources = new Map<string, SheetResource>();
  for (const [id, def] of registry.resources) {
    if (!attachedPaths.has(def.declaredIn)) continue;
    const r = resource(id); if (r) resources.set(id, r);
  }

  const sheet: Sheet = {
    variables,
    resources,
    attachments: assembly.attachments,
    classLevels: assembly.classLevels,
    registry,
    diagnostics,
    value: (id) => {
      const c = canon(id);
      if (!c) throw new Error(`unknown variable "${id}"`);
      return resolve(c).value;
    },
    render: (src) => {
      let out = src;
      const parts = extractInlineExpressions(src, 1);
      for (const p of parts) {
        let rendered: string;
        try { rendered = formatValue(evaluate(parse(p.expr), makeEnv({}))); } catch { rendered = `⚠ ${p.expr}`; }
        out = replaceInline(out, p.expr, rendered);
      }
      return out;
    },
  };
  return sheet;
}

/** Replace the first {{ expr ... }} whose expression text matches. */
function replaceInline(src: string, expr: string, rendered: string): string {
  const re = /\{\{([^{}]*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const inner = m[1].split("|")[0].trim();
    if (inner === expr.trim()) return src.slice(0, m.index) + rendered + src.slice(m.index + m[0].length);
  }
  return src;
}
