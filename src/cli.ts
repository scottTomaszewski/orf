import { loadDocumentsLenient } from "./document.js";
import { lintAll } from "./lint.js";
import { buildRegistry, type Diagnostic } from "./registry.js";

export function main(argv: string[]): number {
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
