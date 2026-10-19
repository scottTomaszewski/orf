import { test } from "@playwright/test";
import { createCharacter, editRatfolk, expectWoundsMax, open, openCharacter, PIP, save, tab, writeRatfolk } from "./flows.js";
import { human, installOverlay } from "./pace.js";

/**
 * The demo, recorded: `npm run demo:record` writes demo/orf-demo.mp4 (and .gif). Same flow as
 * ripple.spec.ts, at human pace with a visible cursor and captions. DEMO_SPEED=0.5 halves the pauses.
 */
test("demo: write content, watch it ripple", async ({ page }) => {
  test.setTimeout(300_000);
  await installOverlay(page);
  const p = human(page);

  await open(page, "write", /write/i);
  await p.pause(600);
  await p.caption("ORF is Markdown with a YAML header. Write an ancestry in the sheet…");
  await writeRatfolk(page, p);
  await p.caption("…and the file writes itself. No problems, so Save.");
  await p.pause(1200);
  await save(page, p, "Ratfolk");
  await p.caption("The Reader already knows Ratfolk. Make a character with it.");
  await p.pause(1200);

  await tab(page, p, "Create", /create/i);
  await createCharacter(page, p, PIP);
  await p.caption("Wounds max is 7: the usual 6, plus Ratfolk. Tap any number to see where it came from.");
  await expectWoundsMax(page, p, 7, "Ratfolk");

  await p.caption("Change the file. Everything that reads it follows.");
  await tab(page, p, "Content", /content/i);
  await editRatfolk(page, p, "2");
  await openCharacter(page, p, PIP.name);
  await p.caption("Wounds max is 8. One file, every tool.");
  await expectWoundsMax(page, p, 8, "Ratfolk");
  await p.caption("ORF: Open Rules Format. The guide is in the repo.");
  await p.pause(2500);
  await p.caption("");
});
