import type { Document } from "./document.js";
import { DocumentError } from "./document.js";
import { extractInlineExpressions, extractReferences } from "./expr-refs.js";
import { DOC_ID_RE, OPS, type Diagnostic, type Registry } from "./registry.js";

const TRANSFER = ["always", "equipped", "carried"];
const STATS = ["str", "dex", "int", "wil"];
const SPECIAL_IDENTS = new Set(["key", "secondary", "amount", "spent", "choice"]);

type FM = Record<string, unknown>;
const isObj = (v: unknown): v is FM => typeof v === "object" && v !== null && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function lintDocument(doc: Document, registry: Registry): Diagnostic[] {
  const out: Diagnostic[] = [];
  const fm = doc.frontmatter;
  const err = (message: string, line?: number) => out.push({ path: doc.path, message, line });

  // Rule 1: identity
  if (typeof fm.id !== "string" || !DOC_ID_RE.test(fm.id)) err(`id missing or malformed: "${String(fm.id)}" (want dotted lowercase like nimble.ancestries.dwarf)`);
  for (const k of ["type", "name"]) if (typeof fm[k] !== "string" || fm[k] === "") err(`missing "${k}"`);
  if (typeof fm.system !== "string") err(`missing "system"`);
  else if (registry.packages.size > 0 && fm.type !== "package") {
    const pkg = fm.system.split("@")[0];
    if (!registry.packages.has(pkg)) err(`system "${fm.system}" does not name a loaded package (loaded: ${[...registry.packages.keys()].join(", ")})`);
  }

  const resolveVar = (id: string): string | undefined => {
    if (registry.variables.has(id)) return id;
    const canon = registry.aliases.get(id);
    return canon;
  };

  const checkExpression = (expr: string, context: string, line?: number) => {
    const refs = extractReferences(expr);
    const predicateArgs = new Set<string>();
    for (const call of refs.calls) {
      const pred = registry.predicates.get(call.name);
      if (pred) {
        for (const a of call.args) {
          predicateArgs.add(a);
          if (!pred.args.includes(a) && !resolveVar(a)) err(`unknown argument "${a}" for predicate ${call.name}() in "${context}" (declared: ${pred.args.join(", ")})`, line);
        }
        continue;
      }
      if (call.name === "table") {
        const t = call.strings[0];
        if (t === undefined) err(`table() needs a quoted table id as its first argument in "${context}"`, line);
        else if (!registry.tables.has(t)) err(`unknown table "${t}" in "${context}"`, line);
        continue;
      }
      if (!registry.functions.has(call.name)) err(`unknown function "${call.name}" in "${context}"`, line);
    }
    for (const id of refs.identifiers) {
      if (predicateArgs.has(id)) continue;
      if (SPECIAL_IDENTS.has(id) || id.startsWith("this.")) continue;
      if (resolveVar(id)) continue;
      if (id.endsWith(".current") && registry.resources.has(id.slice(0, -".current".length))) continue;
      err(`unknown identifier "${id}" in "${context}"`, line);
    }
  };

  // Rule 2-3: effects
  for (const [i, raw] of asArray(fm.effects).entries()) {
    if (!isObj(raw)) { err(`effects[${i}] must be a mapping`); continue; }
    const e = raw;
    const ops = OPS.filter((op) => op in e);
    if (ops.length !== 1) err(`effects[${i}] must have exactly one operation key (${OPS.join(", ")}); found ${ops.length ? ops.join(", ") : "none"}`);
    if (typeof e.target !== "string") err(`effects[${i}] missing "target"`);
    else {
      const canon = resolveVar(e.target);
      if (!canon) err(`effects[${i}]: unknown target "${e.target}"`);
      else if (ops.length === 1) {
        const def = registry.variables.get(canon)!;
        if (def.ops && !def.ops.includes(ops[0])) err(`effects[${i}]: op "${ops[0]}" not allowed on ${canon} (allowed: ${def.ops.join(", ")})`);
      }
    }
    for (const op of ops) {
      const v = e[op];
      if (typeof v === "string") checkExpression(v, `${op}: ${v}`);
      else if (typeof v !== "number" && typeof v !== "boolean") err(`effects[${i}].${op} must be a number, boolean, or expression string`);
    }
    for (const k of ["when", "source"]) if (k in e && typeof e[k] !== "string") err(`effects[${i}].${k} must be a string`);
    if (typeof e.when === "string") checkExpression(e.when, `when: ${e.when}`);
    if ("transfer" in e && !TRANSFER.includes(String(e.transfer))) err(`effects[${i}].transfer must be one of ${TRANSFER.join(", ")}`);
  }

  // Rule 4: expressions in body and string properties, variable formulas, resource max/when
  try {
    for (const x of extractInlineExpressions(doc.body, doc.bodyStartLine)) checkExpression(x.expr, `{{ ${x.expr} }}`, x.line);
  } catch (e) {
    if (e instanceof DocumentError) err(e.message.replace(/^<body>:\d+: /, ""), e.line);
    else throw e;
  }
  const RESERVED = new Set(["id", "type", "system", "name", "effects", "grants", "choices", "variables", "resources", "requires", "tags", "version"]);
  for (const [k, v] of Object.entries(fm)) {
    if (RESERVED.has(k) || typeof v !== "string" || !v.includes("{{")) continue;
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
    for (const [j, rr] of asArray(raw.refresh).entries()) {
      if (!isObj(rr)) { err(`resources[${i}].refresh[${j}] must be a mapping`); continue; }
      if (typeof rr.on !== "string" || !registry.events.has(rr.on)) err(`resources[${i}].refresh[${j}]: unknown event "${String(rr.on)}" (declared: ${[...registry.events.keys()].join(", ")})`);
      if ("to" in rr && rr.to !== "max" && typeof rr.to !== "number") err(`resources[${i}].refresh[${j}].to must be "max" or a number`);
      if ("add" in rr && typeof rr.add !== "number") err(`resources[${i}].refresh[${j}].add must be a number`);
      if (!("to" in rr) && !("add" in rr)) err(`resources[${i}].refresh[${j}] needs "to" or "add"`);
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

  // Rule 6: character
  if (fm.type === "character") {
    if (!isObj(fm.stats)) err(`character missing "stats"`);
    else for (const s of STATS) if (!Number.isInteger((fm.stats as FM)[s])) err(`stats.${s} must be an integer`);
    for (const k of ["ancestry", "background"]) if (typeof fm[k] === "string" && !registry.documentIds.has(fm[k] as string)) err(`${k}: unknown document id "${String(fm[k])}"`);
    for (const [i, c] of asArray(fm.classes).entries()) {
      if (!isObj(c) || typeof c.id !== "string" || !Number.isInteger(c.level)) { err(`classes[${i}] must be {id, level}`); continue; }
      if (!registry.documentIds.has(c.id)) err(`classes[${i}]: unknown document id "${c.id}"`);
    }
    for (const [i, l] of asArray(fm.levels).entries()) if (!isObj(l) || !Number.isInteger(l.level) || !Number.isInteger(l.hp)) err(`levels[${i}] must be {level, hp}`);
    for (const k of ["features", "spells"]) for (const id of asArray(fm[k])) if (!registry.documentIds.has(String(id))) err(`${k}: unknown document id "${String(id)}"`);
    if (isObj(fm.choices)) {
      for (const [slot, picks] of Object.entries(fm.choices)) {
        if (!registry.slots.has(slot)) err(`choices: unknown slot "${slot}"`);
        if (!Array.isArray(picks)) { err(`choices["${slot}"] must be a list`); continue; }
        for (const p of picks) if (!registry.documentIds.has(String(p)) && !STATS.includes(String(p))) err(`choices["${slot}"]: unknown pick "${String(p)}"`);
      }
    }
    for (const [i, e] of asArray(fm.equipment).entries()) {
      if (!isObj(e) || typeof e.id !== "string" || typeof e.equipped !== "boolean") { err(`equipment[${i}] must be {id, equipped: boolean}`); continue; }
      if (!registry.documentIds.has(e.id)) err(`equipment[${i}]: unknown document id "${e.id}"`);
    }
    if (!isObj(fm.state)) err(`character missing "state"`);
    else for (const k of Object.keys(fm.state)) if (k !== "conditions" && !registry.resources.has(k)) err(`state.${k}: not a declared resource (declared: ${[...registry.resources.keys()].join(", ")})`);
  }

  // Rule 7: class-level
  if (fm.type === "class-level") {
    if (typeof fm.class !== "string") err(`class-level missing "class"`);
    else if (!registry.documentIds.has(fm.class)) err(`class: unknown document id "${fm.class}"`);
    if (!Number.isInteger(fm.level)) err(`class-level missing integer "level"`);
    for (const id of asArray(fm.grants)) if (!registry.documentIds.has(String(id))) err(`grants: unknown document id "${String(id)}"`);
    for (const [i, c] of asArray(fm.choices).entries()) {
      if (!isObj(c)) { err(`choices[${i}] must be a mapping`); continue; }
      if (typeof c.slot !== "string") err(`choices[${i}] missing "slot"`);
      if (!Number.isInteger(c.count) || (c.count as number) < 1) err(`choices[${i}].count must be an integer >= 1`);
      const from = c.from;
      if (!isObj(from) || (typeof from.type !== "string" && !Array.isArray(from.options))) err(`choices[${i}].from needs "type" (with optional "tags") or "options"`);
      if ("unique" in c && !["slot", "character"].includes(String(c.unique))) err(`choices[${i}].unique must be "slot" or "character"`);
    }
  }
  return out;
}

export function lintAll(docs: Document[], registry: Registry): Diagnostic[] {
  return docs.flatMap((d) => lintDocument(d, registry));
}
