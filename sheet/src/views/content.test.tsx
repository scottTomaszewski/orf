import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { beforeEach, expect, test } from "vitest";
import { memoryHomebrewStore, type ContentFile } from "../../../src/content-store.js";
import { App } from "../app.js";
import { localCharacterStore } from "../character-store.js";
import { realContent } from "../test-content.js";

beforeEach(() => { localStorage.clear(); });
const ratfolk: ContentFile = { path: "homebrew/ratfolk.md", origin: "homebrew", text: "---\nid: nimble.ancestries.ratfolk\ntype: ancestry\nsystem: nimble\nname: Ratfolk\neffects:\n  - {target: wounds.max, add: 1}\n---\nHard to kill.\n" };
const broken: ContentFile = { path: "homebrew/broken.md", origin: "homebrew", text: "---\nid: x.broken\nname: \"a\" b\n---\n" };

test("the Content view lists homebrew files and problems; a homebrew ancestry ripples onto a character", async () => {
  const content = realContent();
  const homebrew = memoryHomebrewStore([ratfolk, broken]);
  const loader = async () => { const { loadContent } = await import("../../../src/content-store.js"); return loadContent({ built: "test", files: content.files.map((f) => ({ path: f.path, text: f.text })) }, await homebrew.list()); };
  location.hash = "#/content";
  render(<App loader={loader} homebrew={homebrew} storage={localStorage} />);
  const files = await screen.findByRole("region", { name: /homebrew/i });
  expect(await within(files).findByText("homebrew/ratfolk.md")).toBeTruthy();
  await waitFor(() => expect(screen.getByRole("region", { name: /problems/i }).textContent).toMatch(/homebrew\/broken\.md/));
  expect(screen.getByRole("region", { name: /problems/i }).textContent).not.toMatch(/ratfolk/);
  // ripple: a character with the homebrew ancestry
  const pip = content.docs.get("scott.characters.pip")!;
  localCharacterStore(localStorage).save({ ...pip, frontmatter: { ...pip.frontmatter, ancestry: "nimble.ancestries.ratfolk" } });
  fireEvent.click(screen.getByRole("tab", { name: "Play" }));
  fireEvent.click(await screen.findByText("Pip"));
  const wounds = await screen.findByRole("region", { name: /wounds/i });
  fireEvent.click(within(wounds).getByRole("button", { name: /^max 7$/ }));
  expect((await screen.findByRole("dialog")).textContent).toMatch(/Ratfolk/);
  // remove the homebrew file and reload: the ancestry is gone and the sheet says so
  fireEvent.click(screen.getByRole("tab", { name: "Content" }));
  fireEvent.click(await screen.findByRole("button", { name: /remove homebrew\/ratfolk\.md/i }));
  await waitFor(async () => expect((await homebrew.list()).map((f) => f.path)).toEqual(["homebrew/broken.md"]));
});

test("the Reader lists documents by type, filters by name, and renders a document's text", async () => {
  const content = realContent();
  location.hash = "#/reader";
  render(<App loader={async () => content} homebrew={memoryHomebrewStore()} storage={localStorage} />);
  const search = await screen.findByLabelText(/search/i);
  fireEvent.input(search, { target: { value: "oozeling" } });
  fireEvent.click(await screen.findByRole("button", { name: /^Oozeling$/ }));
  const article = await screen.findByRole("article");
  expect(article.textContent).toMatch(/Hit Dice always heal their maximum/);
  expect(article.textContent).toMatch(/ancestry/);
});
