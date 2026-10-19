import { loadDocumentsLenient } from "./document.js";
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
  if (all.length) { console.log(""); for (const d of all) console.log(`${d.path}: ${d.message}`); return 1; }
  return 0;
}

export function main(argv: string[]): number {
  if (argv[0] === "sheet") return sheet(argv[1] ?? "", argv.slice(2));
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
