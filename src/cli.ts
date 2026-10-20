import { readFileSync, statSync, writeFileSync } from "node:fs";
import { listDocumentFiles, loadDocumentsLenient } from "./document-fs.js";
import { mapBody, toPortable, toShort } from "./inline.js";
import { evaluateCharacter } from "./engine.js";
import { formatValue } from "./expr/value.js";
import { lintAll } from "./lint.js";
import { buildRegistry, type Diagnostic } from "./registry.js";

/** `sheet <character-id> <dirs...>`: print a character's variables with provenance, resources, diagnostics. */
function sheet(characterId: string, dirs: string[]): number {
  const { docs, errors } = loadDocumentsLenient(dirs.length ? dirs : ["systems", "examples"]);
  for (const e of errors) console.log(`${e.path}: ${e.message}`);
  const { registry, diagnostics: regDiags } = buildRegistry(docs);
  const byId = new Map(docs.map((d) => [String(d.frontmatter.id), d]));
  const character = byId.get(characterId);
  if (!character) { console.log(`no document with id "${characterId}"`); return 1; }
  const s = evaluateCharacter(character, registry, byId);
  for (const id of [...s.variables.keys()].sort()) {
    const v = s.variables.get(id)!;
    console.log(`${id} = ${formatValue(v.value)}  (${v.name})`);
    for (const c of v.provenance.contributions) console.log(`  ← ${c.op} ${formatValue(c.value)} from ${c.origin}${c.whenText ? ` when ${c.whenText}` : ""}`);
    for (const c of v.provenance.shadowed) console.log(`  ✗ ${c.op} ${formatValue(c.value)} from ${c.origin} (shadowed by set)`);
    for (const c of v.provenance.dropped) console.log(`  ✗ ${c.op} ${formatValue(c.value)} from ${c.origin} (same source, lower)`);
  }
  console.log("");
  for (const id of [...s.resources.keys()].sort()) {
    const r = s.resources.get(id)!;
    console.log(`${id}: ${r.current}${r.max !== undefined ? `/${r.max}` : ""}`);
  }
  const all = [...regDiags, ...s.diagnostics];
  if (all.length) { console.log(""); for (const d of all) console.log(`${d.severity === "warning" ? "warning: " : ""}${d.path}: ${d.message}`); }
  return all.some((d) => d.severity !== "warning") ? 1 : 0;
}

/** `fmt --portable|--short <files or dirs...>`: rewrite every inline expression in each document's body in one spelling; the header is untouched. */
function fmt(args: string[]): number {
  const form = args.find((a) => a === "--portable" || a === "--short");
  if (!form) { console.log("usage: fmt --portable|--short <files or dirs...>   (portable: <span data-orf> for plain Markdown renderers; short: {{ }})"); return 1; }
  const paths = args.filter((a) => a !== form);
  const files = paths.flatMap((p) => (statSync(p).isDirectory() ? listDocumentFiles([p]) : [p]));
  const convert = form === "--portable" ? toPortable : toShort;
  let changed = 0;
  for (const f of files) {
    const before = readFileSync(f, "utf8");
    let after: string;
    try { after = mapBody(before, convert); } catch (e) { console.log(`${f}: ${e instanceof Error ? e.message : String(e)}`); return 1; }
    if (after !== before) { writeFileSync(f, after); changed++; console.log(`fmt: ${f}`); }
  }
  console.log(`OK: ${changed} of ${files.length} files rewritten (${form.slice(2)})`);
  return 0;
}

export function main(argv: string[]): number {
  if (argv[0] === "sheet") return sheet(argv[1] ?? "", argv.slice(2));
  if (argv[0] === "fmt") return fmt(argv.slice(1));
  const dirs = argv.length ? argv : ["systems", "examples"];
  const diagnostics: Diagnostic[] = [];
  const { docs, errors } = loadDocumentsLenient(dirs);
  for (const e of errors) diagnostics.push({ path: e.path, message: e.message.replace(/^.*?: /, ""), line: e.line });
  const { registry, diagnostics: regDiags } = buildRegistry(docs);
  diagnostics.push(...regDiags, ...lintAll(docs, registry));
  diagnostics.sort((a, b) => a.path.localeCompare(b.path) || (a.line ?? 0) - (b.line ?? 0));
  for (const d of diagnostics) console.log(`${d.path}:${d.line ?? ""}: ${d.message}`.replace(/::/, ":"));
  if (diagnostics.length) return 1;
  console.log(`OK: ${docs.length} documents, ${registry.variables.size} variables, ${registry.resources.size} resources`);
  return 0;
}

if (process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js")) process.exit(main(process.argv.slice(2)));
