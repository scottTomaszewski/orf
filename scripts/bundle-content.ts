/** Build sheet/public/content/nimble.json from the Nimble content trees. Run: npm run bundle-content */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { listDocumentFiles } from "../src/document.js";

const dirs = ["systems/nimble", "examples/nimble"];
const out = process.argv[2] ?? "sheet/public/content/nimble.json";
const files = listDocumentFiles(dirs).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const noticePath = join("systems/nimble", "LICENSE-NOTICE.md");
const bundle = { built: new Date().toISOString(), notice: existsSync(noticePath) ? readFileSync(noticePath, "utf8") : undefined, files };
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(bundle));
console.log(`wrote ${out}: ${files.length} files`);
