/** Load the real content trees from disk for tests (node only). */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadContent, type Loaded } from "../../src/content-store.js";

const root = join(__dirname, "../..");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".md") && name.toLowerCase() !== "readme.md" && !name.toUpperCase().startsWith("LICENSE")) out.push(p);
  }
  return out;
}
export function realContent(): Loaded {
  const files = [...walk(join(root, "systems/nimble")), ...walk(join(root, "examples/nimble"))].map((p) => ({ path: p.slice(root.length + 1), text: readFileSync(p, "utf8") }));
  return loadContent({ built: "test", files }, []);
}
