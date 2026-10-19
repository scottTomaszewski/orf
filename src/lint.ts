import type { Document } from "./document.js";
import { DocumentError } from "./document.js";
import { extractInlineExpressions, extractReferences } from "./expr-refs.js";
import { DOC_ID_RE, OPS, type Diagnostic, type Registry } from "./registry.js";

const TRANSFER = ["always", "equipped", "carried"];
const STATS = ["str", "dex", "int", "wil"];
const RESERVED = ["id", "type", "system", "name", "effects", "grants", "choices", "variables", "resources", "requires", "tags", "version"];
const EFFECT_KEYS = new Set([...OPS, "target", "when", "source", "transfer", "duration"]);
const CHOICE_KEYS = new Set(["slot", "count", "from", "unique", "effect", "when"]);
const REFRESH_KEYS = new Set(["on", "to", "add"]);
const ITEM_TYPES = ["item", "armor", "weapon"];

type FM = Record<string, unknown>;
const isObj = (v: unknown): v is FM => typeof v === "object" && v !== null && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

interface ExprOpts { idents?: Set<string>; functions?: Set<string>; allowChoice?: boolean }

export function lintDocument(doc: Document, registry: Registry): Diagnostic[] {
  const out: Diagnostic[] = [];
  const fm = doc.frontmatter;
  const err = (message: string, line?: number) => out.push({ path: doc.path, message, line });

  // Rule 1: identity
  const idOk = typeof fm.id === "string" && (fm.type === "package" ? /^[a-z0-9-]+$/.test(fm.id) : DOC_ID_RE.test(fm.id));
  if (!idOk) err(`id missing or malformed: "${String(fm.id)}" (want ${fm.type === "package" ? "a bare package id like nimble" : "dotted lowercase like nimble.ancestries.dwarf"})`);
  for (const k of ["type", "name"]) if (typeof fm[k] !== "string" || fm[k] === "") err(`missing "${k}"`);
  if (typeof fm.system !== "string") err(`missing "system"`);
  else if (registry.packages.size > 0 && fm.type !== "package") {
    const pkg = fm.system.split("@")[0];
    if (!registry.packages.has(pkg)) err(`system "${fm.system}" does not name a loaded package (loaded: ${[...registry.packages.keys()].join(", ")})`);
  }

  // Reserved list-valued properties must be lists
  for (const k of ["effects", "grants", "tags", "variables", "resources", "members"]) if (k in fm && !Array.isArray(fm[k])) err(`${k} must be a list`);
  if ("choices" in fm && fm.type !== "character" && !Array.isArray(fm.choices)) err(`choices must be a list`);
  if ("handlers" in fm && fm.type !== "events") err(`handlers are only allowed on a "type: events" document (this is type: ${String(fm.type)})`);

  const resolveVar = (id: string): string | undefined => (registry.variables.has(id) ? id : registry.aliases.get(id));

  const checkExpression = (expr: string, context: string, line?: number, opts: ExprOpts = {}) => {
    let depth = 0;
    for (const ch of expr) { if (ch === "(") depth++; else if (ch === ")") depth--; if (depth < 0) break; }
    if (depth !== 0) { err(`unbalanced parentheses in "${context}"`, line); return; }
    const refs = extractReferences(expr);
    const consumedArgs = new Set<string>();
    for (const call of refs.calls) {
      const pred = registry.predicates.get(call.name);
      if (pred) {
        if (call.name === "has") {
          const id = call.strings[0];
          if (id === undefined) err(`has() needs a quoted document id in "${context}"`, line);
          else if (!registry.documentIds.has(id)) err(`has(): unknown document id "${id}" in "${context}"`, line);
          for (const a of call.args) consumedArgs.add(a);
          continue;
        }
        for (const a of call.args) {
          consumedArgs.add(a);
          if (!pred.args.includes(a)) err(`unknown argument "${a}" for predicate ${call.name}() in "${context}" (declared: ${pred.args.join(", ")})`, line);
        }
        continue;
      }
      if (call.name === "table") {
        const t = call.strings[0];
        if (t === undefined) err(`table() needs a quoted table id as its first argument in "${context}"`, line);
        else if (!registry.tables.has(t)) err(`unknown table "${t}" in "${context}"`, line);
        continue;
      }
      if (!registry.functions.has(call.name) && !opts.functions?.has(call.name)) err(`unknown function "${call.name}" in "${context}"`, line);
    }
    for (const id of refs.identifiers) {
      if (consumedArgs.has(id)) continue;
      if (id === "key" || id === "secondary") continue;
      if (opts.idents?.has(id)) continue;
      if (opts.allowChoice && id === "choice") continue;
      if (id.startsWith("this.")) {
        if (!(id.slice(5) in fm)) err(`unknown identifier "${id}": this document has no property "${id.slice(5)}" (in "${context}")`, line);
        continue;
      }
      if (resolveVar(id)) continue;
      if (id.endsWith(".current") && registry.resources.has(id.slice(0, -".current".length))) continue;
      err(`unknown identifier "${id}" in "${context}"`, line);
    }
  };

  const checkEffect = (raw: unknown, label: string, opts: ExprOpts = {}) => {
    if (!isObj(raw)) { err(`${label} must be a mapping`); return; }
    const e = raw;
    for (const k of Object.keys(e)) if (!EFFECT_KEYS.has(k)) err(`${label}: unknown key "${k}" (allowed: ${[...EFFECT_KEYS].join(", ")})`);
    const ops = OPS.filter((op) => op in e);
    if (ops.length !== 1) err(`${label} must have exactly one operation key (${OPS.join(", ")}); found ${ops.length ? ops.join(", ") : "none"}`);
    if (typeof e.target !== "string") err(`${label} missing "target"`);
    else if (!(opts.allowChoice && /^\{\{\s*choice\s*\}\}$/.test(e.target))) {
      const canon = resolveVar(e.target);
      if (!canon) err(`${label}: unknown target "${e.target}"`);
      else if (ops.length === 1) {
        const def = registry.variables.get(canon)!;
        if (def.ops && !def.ops.includes(ops[0])) err(`${label}: op "${ops[0]}" not allowed on ${canon} (allowed: ${def.ops.join(", ")})`);
      }
    }
    for (const op of ops) {
      const v = e[op];
      if (typeof v === "string") checkExpression(v, `${op}: ${v}`, undefined, opts);
      else if (typeof v !== "number" && typeof v !== "boolean") err(`${label}.${op} must be a number, boolean, or expression string`);
    }
    for (const k of ["when", "source", "duration"]) if (k in e && typeof e[k] !== "string") err(`${label}.${k} must be a string`);
    if (typeof e.when === "string") checkExpression(e.when, `when: ${e.when}`, undefined, opts);
    if ("transfer" in e && !TRANSFER.includes(String(e.transfer))) err(`${label}.transfer must be one of ${TRANSFER.join(", ")}`);
  };

  // Rules 2-3: effects
  for (const [i, raw] of asArray(fm.effects).entries()) checkEffect(raw, `effects[${i}]`);

  // Rule 4: expressions in body, string properties, variable formulas
  try {
    for (const x of extractInlineExpressions(doc.body, doc.bodyStartLine)) checkExpression(x.expr, `{{ ${x.expr} }}`, x.line);
  } catch (e) {
    if (e instanceof DocumentError) err(e.message.replace(/^<body>:\d+: /, ""), e.line);
    else throw e;
  }
  for (const [k, v] of Object.entries(fm)) {
    if (RESERVED.includes(k)) continue;
    if (isObj(v) && Object.keys(v).some((kk) => kk.startsWith("{"))) { err(`property "${k}": looks like an unquoted {{ }} that YAML parsed as a mapping; quote the value`); continue; }
    if (typeof v !== "string" || !v.includes("{{")) continue;
    try {
      for (const x of extractInlineExpressions(v, 1)) checkExpression(x.expr, `${k}: {{ ${x.expr} }}`);
    } catch (e) {
      if (e instanceof DocumentError) err(`property "${k}": ${e.message.replace(/^<body>:\d+: /, "")}`);
      else throw e;
    }
  }
  for (const raw of asArray(fm.variables)) if (isObj(raw) && typeof raw.formula === "string") checkExpression(raw.formula, `variable ${String(raw.id)} formula: ${raw.formula}`);

  // Rule 5: resources
  for (const [i, raw] of asArray(fm.resources).entries()) {
    if (!isObj(raw)) { err(`resources[${i}] must be a mapping`); continue; }
    if (typeof raw.max === "string") checkExpression(raw.max, `resources[${i}].max: ${raw.max}`);
    if (typeof raw.when === "string") checkExpression(raw.when, `resources[${i}].when: ${raw.when}`);
    if ("refresh" in raw && !Array.isArray(raw.refresh)) err(`resources[${i}].refresh must be a list`);
    for (const [j, rr] of asArray(raw.refresh).entries()) {
      if (!isObj(rr)) { err(`resources[${i}].refresh[${j}] must be a mapping`); continue; }
      for (const k of Object.keys(rr)) if (!REFRESH_KEYS.has(k)) err(`resources[${i}].refresh[${j}]: unknown key "${k}"`);
      if (typeof rr.on !== "string" || !registry.events.has(rr.on)) err(`resources[${i}].refresh[${j}]: unknown event "${String(rr.on)}" (declared: ${[...registry.events.keys()].join(", ")})`);
      if ("to" in rr && rr.to !== "max" && typeof rr.to !== "number") err(`resources[${i}].refresh[${j}].to must be "max" or a number`);
      if ("add" in rr && typeof rr.add !== "number") err(`resources[${i}].refresh[${j}].add must be a number`);
      if (!("to" in rr) && !("add" in rr)) err(`resources[${i}].refresh[${j}] needs "to" or "add"`);
    }
  }

  // Rule 9: event handlers (template only)
  if (fm.type === "events" && isObj(fm.handlers)) {
    const localEvents = new Set(asArray(fm.events).map((e) => (isObj(e) ? String(e.id) : "")));
    const argsOf = (ev: string): string[] => {
      const local = asArray(fm.events).find((e) => isObj(e) && e.id === ev);
      if (isObj(local) && Array.isArray(local.args)) return local.args.map(String);
      return registry.events.get(ev)?.args ?? [];
    };
    const BUILTIN_ARGS: Record<string, string[]> = { damage: ["amount", "crit"], heal: ["amount"], spend: ["resource", "amount"], restore: ["resource", "amount"], "catch-breath": ["hit_dice"], "make-camp": ["hit_dice"], "encounter-start": ["initiative_roll"], "level-up": ["level"] };
    const handlerFns = new Set(["roll"]);
    const checkSteps = (steps: unknown[], ctx: string, idents: Set<string>) => {
      for (const [j, st] of steps.entries()) {
        if (!isObj(st)) { err(`${ctx}[${j}] must be a mapping`); continue; }
        const c = `${ctx}[${j}]`;
        for (const k of ["spend", "restore"]) if (typeof st[k] === "string" && !registry.resources.has(st[k] as string)) err(`${c}.${k}: "${st[k]}" is not a declared resource`);
        for (const k of ["set", "clear"]) if (typeof st[k] === "string" && !resolveVar(st[k] as string)) err(`${c}.${k}: unknown state boolean "${st[k]}"`);
        if (typeof st.fire === "string" && !registry.events.has(st.fire) && !localEvents.has(st.fire)) err(`${c}.fire: unknown event "${st.fire}"`);
        for (const k of ["amount", "when"]) if (typeof st[k] === "string") checkExpression(st[k] as string, `${c}.${k}: ${st[k]}`, undefined, { idents, functions: handlerFns });
        if ("repeat" in st) {
          if (typeof st.repeat === "string" && !registry.resources.has(st.repeat)) checkExpression(st.repeat, `${c}.repeat: ${st.repeat}`, undefined, { idents, functions: handlerFns });
          if (Array.isArray(st.steps)) checkSteps(st.steps, `${c}.steps`, idents);
        }
      }
    };
    for (const [ev, steps] of Object.entries(fm.handlers)) {
      if (!registry.events.has(ev) && !localEvents.has(ev)) { err(`handlers.${ev}: unknown event`); continue; }
      const idents = new Set([...(BUILTIN_ARGS[ev] ?? []), ...argsOf(ev), "amount", "spent", "crit"]);
      if (!Array.isArray(steps)) { err(`handlers.${ev} must be a list of steps`); continue; }
      checkSteps(steps, `handlers.${ev}`, idents);
    }
  }

  // Rule 8: requires
  if ("requires" in fm) {
    if (isObj(fm.requires)) {
      for (const [k, v] of Object.entries(fm.requires)) if (!STATS.includes(k) || typeof v !== "number") err(`requires.${k} must be one of ${STATS.join("/")} with an integer value`);
    } else if (Array.isArray(fm.requires)) {
      for (const id of fm.requires) if (!registry.documentIds.has(String(id))) err(`requires: unknown document id "${String(id)}"`);
    } else err(`requires must be a {stat: n} mapping or a list of document ids`);
  }

  // Grants (any document) and grants_by_level (subclasses)
  for (const id of asArray(fm.grants)) if (!registry.documentIds.has(String(id))) err(`grants: unknown document id "${String(id)}"`);
  if ("grants_by_level" in fm) {
    if (!isObj(fm.grants_by_level)) err(`grants_by_level must be a mapping of level to id list`);
    else for (const [lvl, ids] of Object.entries(fm.grants_by_level)) {
      if (!Array.isArray(ids)) { err(`grants_by_level[${lvl}] must be a list`); continue; }
      for (const id of ids) if (!registry.documentIds.has(String(id))) err(`grants_by_level[${lvl}]: unknown document id "${String(id)}"`);
    }
  }

  const typeOf = (id: string) => registry.documentTypes.get(id);
  const refOfType = (id: unknown, label: string, types: string[], what: string) => {
    if (typeof id !== "string") { err(`${label} must be a document id`); return; }
    if (!registry.documentIds.has(id)) err(`${label}: unknown document id "${id}"`);
    else if (!types.includes(typeOf(id) ?? "")) err(`${label}: "${id}" is not ${what} (it is type: ${typeOf(id)})`);
  };

  // Rule 6: character
  if (fm.type === "character") {
    if (!isObj(fm.stats)) err(`character missing "stats"`);
    else for (const s of STATS) if (!Number.isInteger((fm.stats as FM)[s])) err(`stats.${s} must be an integer`);
    if ("ancestry" in fm) refOfType(fm.ancestry, "ancestry", ["ancestry"], "an ancestry");
    if ("background" in fm) refOfType(fm.background, "background", ["background"], "a background");
    for (const [i, c] of asArray(fm.classes).entries()) {
      if (!isObj(c)) { err(`classes[${i}] must be {id, level}`); continue; }
      refOfType(c.id, `classes[${i}]`, ["class"], "a class");
      if (!Number.isInteger(c.level) || (c.level as number) < 1 || (c.level as number) > 20) err(`classes[${i}].level must be an integer 1-20`);
    }
    if ("skills" in fm) {
      if (!isObj(fm.skills)) err(`skills must be a mapping`);
      else for (const [k, v] of Object.entries(fm.skills)) {
        if (!registry.variables.has(`skill.${k}.points`)) err(`skills.${k}: not a declared skill (no variable skill.${k}.points)`);
        if (!Number.isInteger(v)) err(`skills.${k} must be an integer`);
      }
    }
    for (const [i, l] of asArray(fm.levels).entries()) if (!isObj(l) || !Number.isInteger(l.level) || !Number.isInteger(l.hp)) err(`levels[${i}] must be {level, hp}`);
    for (const k of ["features", "spells"]) for (const id of asArray(fm[k])) if (!registry.documentIds.has(String(id))) err(`${k}: unknown document id "${String(id)}"`);
    if ("choices" in fm) {
      if (!isObj(fm.choices)) err(`choices on a character must be a mapping of slot id to picks`);
      else for (const [slot, picks] of Object.entries(fm.choices)) {
        const slotDef = registry.slots.get(slot);
        if (!slotDef) err(`choices: unknown slot "${slot}"`);
        if (!Array.isArray(picks)) { err(`choices["${slot}"] must be a list`); continue; }
        for (const p of picks) {
          const pick = String(p);
          const ok = slotDef?.options ? slotDef.options.includes(pick) : registry.documentIds.has(pick);
          if (!ok) err(`choices["${slot}"]: unknown pick "${pick}"${slotDef?.options ? ` (options: ${slotDef.options.join(", ")})` : ""}`);
        }
      }
    }
    for (const [i, e] of asArray(fm.equipment).entries()) {
      if (!isObj(e) || typeof e.equipped !== "boolean") { err(`equipment[${i}] must be {id, equipped: boolean}`); continue; }
      refOfType(e.id, `equipment[${i}]`, ITEM_TYPES, "an item");
    }
    if (!isObj(fm.state)) err(`character missing "state"`);
    else for (const k of Object.keys(fm.state)) if (k !== "conditions" && !registry.resources.has(k)) err(`state.${k}: not a declared resource (declared: ${[...registry.resources.keys()].join(", ")})`);
  }

  // Rule 7: class-level
  if (fm.type === "class-level") {
    if (!("class" in fm)) err(`class-level missing "class"`);
    else refOfType(fm.class, "class", ["class"], "a class");
    if (!Number.isInteger(fm.level) || (fm.level as number) < 1 || (fm.level as number) > 20) err(`class-level missing integer "level" 1-20`);
    for (const [i, c] of asArray(fm.choices).entries()) {
      if (!isObj(c)) { err(`choices[${i}] must be a mapping`); continue; }
      for (const k of Object.keys(c)) if (!CHOICE_KEYS.has(k)) err(`choices[${i}]: unknown key "${k}"`);
      if (typeof c.slot !== "string") err(`choices[${i}] missing "slot"`);
      if (!Number.isInteger(c.count) || (c.count as number) < 1) err(`choices[${i}].count must be an integer >= 1`);
      const from = c.from;
      if (!isObj(from) || (typeof from.type !== "string" && !Array.isArray(from.options))) err(`choices[${i}].from needs "type" (with optional "tags") or "options"`);
      if ("unique" in c && !["slot", "character"].includes(String(c.unique))) err(`choices[${i}].unique must be "slot" or "character"`);
      if ("effect" in c) checkEffect(c.effect, `choices[${i}].effect`, { allowChoice: true });
      if ("when" in c) {
        if (typeof c.when !== "string") err(`choices[${i}].when must be a string`);
        else checkExpression(c.when, `choices[${i}].when: ${c.when}`);
      }
    }
  }
  if (fm.type === "subclass" && "class" in fm) refOfType(fm.class, "class", ["class"], "a class");
  return out;
}

export function lintAll(docs: Document[], registry: Registry): Diagnostic[] {
  return docs.flatMap((d) => lintDocument(d, registry));
}
